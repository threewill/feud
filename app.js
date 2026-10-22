(function () {
  const KEY = "tw-feud-state-v1";
  const CHANNEL = "tw-feud";
  const VIEW =
    window.TW_FEUD_VIEW ||
    new URLSearchParams(location.search).get("view") ||
    (location.hash === "#board" ? "board" : "host");
  const BOARDS = window.TW_FEUD_BOARDS;
  const byId = Object.fromEntries(BOARDS.map((b) => [b.id, b]));

  const defaultState = () => ({
    nameA: "Family A",
    nameB: "Family B",
    scoreA: 0,
    scoreB: 0,
    soundsOn: true,
    focusBoard: true,
    hopBack: true,
    backups: {},
    played: [],
    pendingId: null,
    boardId: null,
    revealed: [],
    leftover: [],
    strikes: 0,
    overlay: null,
    overlayText: "",
    roundAwarded: false,
    awardedTo: null,
    multiplier: 1,
    event: null,
    history: [],
    clockStartedAt: null,
    overlaySticky: false,
  });

  let state = load();
  let overlayTimer = null;
  let boardWin = null;
  let boardArmed = VIEW !== "board";
  let hopTimer = null;
  let audioCtx = null;
  const dingEl = new Audio("sounds/ding.wav");
  const buzzEl = new Audio("sounds/buzzer.wav");
  dingEl.preload = "auto";
  buzzEl.preload = "auto";

  let channel = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (e) => {
      if (e.data && e.data.type === "state") applyRemote(e.data.state);
    };
  } catch (_) {
    /* file:// may still support localStorage */
  }
  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin) return;
    if (e.data && e.data.type === "state") applyRemote(e.data.state);
  });
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) {
      try {
        applyRemote(JSON.parse(e.newValue));
      } catch (_) {}
    }
  });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (_) {}
    return defaultState();
  }

  function persist() {
    const json = JSON.stringify(state);
    try {
      localStorage.setItem(KEY, json);
    } catch (_) {}
    if (channel) {
      try {
        channel.postMessage({ type: "state", state });
      } catch (_) {}
    }
    if (VIEW === "host") pushToBoard(true);
  }

  function pushToBoard(bringToFront) {
    if (!boardWin || boardWin.closed) return;
    try {
      boardWin.postMessage({ type: "state", state }, location.origin);
    } catch (_) {}
    try {
      if (typeof boardWin.TW_FEUD_APPLY === "function") boardWin.TW_FEUD_APPLY(state);
    } catch (_) {}
    try {
      const w = boardWin.outerWidth;
      const h = boardWin.outerHeight;
      if (w > 100 && h > 100) {
        boardWin.resizeTo(w, h + 1);
        boardWin.resizeTo(w, h);
      }
    } catch (_) {}
    if (!bringToFront || state.focusBoard === false) return;
    try {
      boardWin.focus();
    } catch (_) {}
    if (state.hopBack === false) return;
    clearTimeout(hopTimer);
    hopTimer = setTimeout(() => {
      try {
        window.focus();
      } catch (_) {}
    }, 400);
  }

  function applyRemote(next) {
    state = Object.assign(defaultState(), next);
    try {
      lastStored = localStorage.getItem(KEY) || lastStored;
    } catch (_) {}
    render();
    maybePlay(state.event);
  }

  function patch(partial) {
    Object.assign(state, partial);
    persist();
    render();
  }

  function board() {
    return state.boardId ? byId[state.boardId] : null;
  }

  function enabledIds() {
    return BOARDS.filter((b) => b.pool === "live" || state.backups[b.id]).map((b) => b.id);
  }

  function remainingIds() {
    const used = new Set(state.played);
    if (state.boardId) used.add(state.boardId);
    if (state.pendingId) used.add(state.pendingId);
    return enabledIds().filter((id) => !used.has(id));
  }

  function rawRoundPoints() {
    const b = board();
    if (!b) return 0;
    return b.answers.reduce((sum, a, i) => {
      if (state.revealed[i] && !state.leftover[i]) return sum + a.pts;
      return sum;
    }, 0);
  }

  function multiplier() {
    return state.multiplier === 2 || state.multiplier === 3 ? state.multiplier : 1;
  }

  function roundPoints() {
    return rawRoundPoints() * multiplier();
  }

  function pickRandom() {
    const left = remainingIds();
    if (!left.length) return null;
    return left[Math.floor(Math.random() * left.length)];
  }

  function nextRound() {
    const played = state.played.slice();
    if (state.boardId && !played.includes(state.boardId)) played.push(state.boardId);
    const nextPlayed = played;
    const used = new Set(nextPlayed);
    const pool = enabledIds().filter((id) => !used.has(id));
    if (!pool.length) {
      patch({
        played: nextPlayed,
        pendingId: null,
        boardId: null,
        revealed: [],
        leftover: [],
        strikes: 0,
        overlay: null,
        roundAwarded: false,
        awardedTo: null,
        multiplier: 1,
        history: [],
      });
      return;
    }
    const pendingId = pool[Math.floor(Math.random() * pool.length)];
    patch({
      played: nextPlayed,
      pendingId,
      boardId: null,
      revealed: [],
      leftover: [],
      strikes: 0,
      overlay: null,
      overlayText: "",
      roundAwarded: false,
      awardedTo: null,
      multiplier: 1,
      history: [],
    });
  }

  function showQuestion() {
    if (!state.pendingId) return;
    const b = byId[state.pendingId];
    patch({
      boardId: state.pendingId,
      pendingId: null,
      revealed: b.answers.map(() => false),
      leftover: b.answers.map(() => false),
      strikes: 0,
      overlay: null,
      roundAwarded: false,
      awardedTo: null,
      multiplier: 1,
      history: [],
      clockStartedAt: state.clockStartedAt || Date.now(),
    });
  }

  function reveal(i) {
    const b = board();
    if (!b || state.revealed[i] || state.roundAwarded) return;
    const revealed = state.revealed.slice();
    revealed[i] = true;
    const history = state.history.concat([{ type: "reveal", i }]);
    const event = { t: Date.now(), kind: "ding", i };
    patch({ revealed, history, event });
    play("ding");
  }

  function strike() {
    if (!board() || state.roundAwarded) return;
    const strikes = Math.min(3, state.strikes + 1);
    const overlay = "x";
    const overlayText = "X".repeat(strikes);
    const history = state.history.concat([{ type: "strike" }]);
    const event = { t: Date.now(), kind: "buzz", strikes };
    patch({ strikes, overlay, overlayText, overlaySticky: false, history, event });
    play("buzz");
    scheduleOverlayClear();
  }

  function scheduleOverlayClear() {
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => {
      if (state.overlaySticky) return;
      if (state.overlay === "x" || state.overlay === "steal" || state.overlay === "win") {
        patch({ overlay: null });
      }
    }, 1600);
  }

  function endGame() {
    const a = state.scoreA;
    const b = state.scoreB;
    let line;
    if (a > b) line = state.nameA + " WINS!";
    else if (b > a) line = state.nameB + " WINS!";
    else line = "IT'S A TIE!";
    patch({
      overlay: "win",
      overlayText: line + "\n" + a + " – " + b,
      overlaySticky: true,
    });
  }

  function undo() {
    const last = state.history[state.history.length - 1];
    if (!last) return;
    const history = state.history.slice(0, -1);
    if (last.type === "reveal") {
      const revealed = state.revealed.slice();
      const leftover = state.leftover.slice();
      revealed[last.i] = false;
      leftover[last.i] = false;
      patch({ revealed, leftover, history, roundAwarded: false, awardedTo: null });
    } else if (last.type === "strike") {
      patch({ strikes: Math.max(0, state.strikes - 1), overlay: null, history });
    } else if (last.type === "leftover") {
      const leftover = state.leftover.slice();
      const revealed = state.revealed.slice();
      last.indexes.forEach((i) => {
        leftover[i] = false;
        revealed[i] = false;
      });
      patch({ leftover, revealed, history });
    } else if (last.type === "award") {
      const scoreA = last.to === "A" ? state.scoreA - last.pts : state.scoreA;
      const scoreB = last.to === "B" ? state.scoreB - last.pts : state.scoreB;
      patch({ scoreA, scoreB, roundAwarded: false, awardedTo: null, overlay: null, history });
    }
  }

  function leftovers() {
    const b = board();
    if (!b) return;
    const revealed = state.revealed.slice();
    const leftover = state.leftover.slice();
    const indexes = [];
    b.answers.forEach((_, i) => {
      if (!revealed[i]) {
        revealed[i] = true;
        leftover[i] = true;
        indexes.push(i);
      }
    });
    if (!indexes.length) return;
    patch({
      revealed,
      leftover,
      history: state.history.concat([{ type: "leftover", indexes }]),
    });
  }

  function award(to) {
    if (!board() || state.roundAwarded) return;
    const pts = roundPoints();
    const scoreA = to === "A" ? state.scoreA + pts : state.scoreA;
    const scoreB = to === "B" ? state.scoreB + pts : state.scoreB;
    const win = scoreA >= 500 || scoreB >= 500;
    patch({
      scoreA,
      scoreB,
      roundAwarded: true,
      awardedTo: to,
      overlay: win ? "win" : null,
      overlayText: win
        ? (scoreA >= 500 ? state.nameA : state.nameB) + " WINS!"
        : "",
      overlaySticky: win,
      history: state.history.concat([{ type: "award", to, pts }]),
    });
  }

  function restart() {
    if (!confirm("Restart the game? Scores and the shuffle reset. Team names stay.")) return;
    patch({
      ...defaultState(),
      nameA: state.nameA,
      nameB: state.nameB,
      soundsOn: state.soundsOn,
      backups: state.backups,
      focusBoard: state.focusBoard,
      hopBack: state.hopBack,
    });
  }

  let lastEventT = 0;
  let lastStored = "";

  function startBoardKeepAlive() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0.00006;
      osc.frequency.value = 18;
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      ctx.resume();
    } catch (_) {}
    try {
      const rtc = new RTCPeerConnection();
      rtc.createDataChannel("tw-feud-keep");
      rtc.createOffer().then((o) => rtc.setLocalDescription(o)).catch(() => {});
    } catch (_) {}
    try {
      if (navigator.wakeLock) navigator.wakeLock.request("screen");
    } catch (_) {}
  }

  if (VIEW === "board") {
    lastStored = (function () {
      try {
        return localStorage.getItem(KEY) || "";
      } catch (_) {
        return "";
      }
    })();
    setInterval(() => {
      try {
        const raw = localStorage.getItem(KEY) || "";
        if (raw && raw !== lastStored) {
          lastStored = raw;
          applyRemote(JSON.parse(raw));
        }
      } catch (_) {}
      document.documentElement.style.setProperty("--tw-tick", String(Date.now() % 1000));
      const clock = document.getElementById("game-clock");
      if (clock) clock.textContent = formatClock();
    }, 120);
    window.TW_FEUD_APPLY = applyRemote;
  }
  function formatClock() {
    if (!state.clockStartedAt) return "0:00";
    const s = Math.max(0, Math.floor((Date.now() - state.clockStartedAt) / 1000));
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const mm = String(m % 60).padStart(h ? 2 : 1, "0");
    const ss = String(s % 60).padStart(2, "0");
    return h ? `${h}:${String(m % 60).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
  }

  function maybePlay(event) {
    if (!event || event.t === lastEventT) return;
    lastEventT = event.t;
    if (VIEW !== "host") return;
    play(event.kind);
  }

  function play(kind) {
    if (!state.soundsOn || VIEW !== "host") return;
    const el = kind === "ding" ? dingEl : buzzEl;
    el.currentTime = 0;
    el.play().catch(() => fallbackTone(kind));
  }

  function fallbackTone(kind) {
    try {
      audioCtx = audioCtx || new AudioContext();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      if (kind === "ding") {
        o.frequency.value = 1320;
        o.type = "sine";
        g.gain.setValueAtTime(0.2, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        o.start();
        o.stop(audioCtx.currentTime + 0.4);
      } else {
        o.frequency.value = 185;
        o.type = "square";
        g.gain.setValueAtTime(0.15, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.7);
        o.start();
        o.stop(audioCtx.currentTime + 0.7);
      }
    } catch (_) {}
  }

  function render() {
    if (VIEW === "board") renderBoard();
    else renderHost();
  }

  function renderBoard() {
    const b = board();
    const n = b ? b.answers.length : 0;
    const cols = 2;
    const rows = Math.max(4, Math.ceil(n / cols));
    let slots = "";
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const i = col * rows + row;
        if (i >= 8 && i >= n) continue;
      }
    }
    const leftCount = Math.ceil(n / 2) || 4;
    const totalSlots = Math.max(n, 8);
    const perCol = Math.ceil(totalSlots / 2);
    const cells = [];
    for (let col = 0; col < 2; col++) {
      for (let row = 0; row < perCol; row++) {
        const i = col * perCol + row;
        const num = i + 1;
        if (!b || i >= n) {
          cells.push(`<div class="slot empty"></div>`);
          continue;
        }
        const shown = state.revealed[i];
        const flipping = shown && state.event && state.event.kind === "ding" && state.event.i === i;
        cells.push(
          `<div class="slot ${shown ? "shown" : "hidden"}${flipping ? " flip" : ""}">
            <div class="num">${num}</div>
            <div class="reveal">
              <div class="label">${escapeHtml(b.answers[i].text)}</div>
              <div class="pts">${b.answers[i].pts}</div>
            </div>
          </div>`
        );
      }
    }
    /* reorder into row-major two columns: we already filled col-major; CSS grid is row-major.
       Build row-major: left col indices 0..perCol-1, right perCol.. */
    const rowMajor = [];
    for (let row = 0; row < perCol; row++) {
      rowMajor.push(cells[row]);
      rowMajor.push(cells[perCol + row]);
    }

    const q = b ? b.question : state.pendingId ? "Survey says…" : "ThreeWill Feud";
    const overlayClass = state.overlay ? "overlay show" : "overlay";
    const overlayInner =
      state.overlay === "win" || state.overlay === "steal"
        ? `<div class="msg">${escapeHtml(state.overlayText || "").replace(/\n/g, "<br>")}</div>`
        : `<div class="x">${escapeHtml(state.overlayText || "")}</div>`;

    document.body.className = "board-body";
    document.body.innerHTML = `
      <div class="logo">THREEWILL FEUD</div>
      <div class="scorebar">
        <div class="family a"><span class="name">${escapeHtml(state.nameA)}</span><span class="score">${state.scoreA}</span></div>
        <div class="round-pts">
          <div class="lbl">ROUND</div>
          <div class="val">${roundPoints()}</div>
          ${multiplier() > 1 ? `<div class="mult">${multiplier() === 3 ? "TRIPLE" : "DOUBLE"}</div>` : ""}
        </div>
        <div class="family b"><span class="name">${escapeHtml(state.nameB)}</span><span class="score">${state.scoreB}</span></div>
      </div>
      <div class="question">${escapeHtml(q)}</div>
      <div class="grid">${rowMajor.join("")}</div>
      <div class="strikes-row">${"✘ ".repeat(state.strikes).trim()}</div>
      <div class="${overlayClass}">${overlayInner}</div>
      <div class="game-clock" id="game-clock">${formatClock()}</div>
      ${
        boardArmed
          ? ""
          : `<div id="arm" class="overlay show"><div class="msg">CLICK ONCE<br><span style="font-size:32px;letter-spacing:0.04em">so Edge keeps this board awake</span></div></div>`
      }
    `;
    void leftCount;
    const arm = document.getElementById("arm");
    if (arm) {
      arm.onclick = () => {
        startBoardKeepAlive();
        boardArmed = true;
        arm.remove();
      };
    }
  }

  function renderHost() {
    const b = board();
    const rem = remainingIds();
    const pending = state.pendingId ? byId[state.pendingId] : null;
    const ans = b
      ? b.answers
          .map(
            (a, i) =>
              `<button class="ans ${state.revealed[i] ? "on" : ""}" data-reveal="${i}" ${
                state.revealed[i] || state.roundAwarded ? "disabled" : ""
              }><span class="p">${a.pts}</span><span>${i + 1}. ${escapeHtml(a.text)}</span></button>`
          )
          .join("")
      : "";
    const backups = BOARDS.filter((x) => x.pool === "backup")
      .map(
        (x) =>
          `<label><input type="checkbox" data-backup="${x.id}" ${
            state.backups[x.id] ? "checked" : ""
          }> ${x.id}</label>`
      )
      .join("");
    const opts = [`<option value="">Jump to remaining…</option>`]
      .concat(
        rem.map((id) => `<option value="${id}">${id} — ${escapeHtml(byId[id].question.slice(0, 72))}</option>`)
      )
      .join("");

    document.body.className = "host-body";
    document.body.innerHTML = `
      <div class="host">
        <h1>Host — ThreeWill Feud</h1>
        <p class="hint">Opens a <strong>separate window</strong> (what Teams can share). Each reveal/strike brings that window to the front so Edge redraws, then hops back here so you can keep clicking.</p>
        <div class="row">
          <button type="button" id="open-board" class="gold">Open audience board</button>
          <label><input type="checkbox" id="sounds" ${state.soundsOn ? "checked" : ""}> Sounds</label>
          <button type="button" id="end-game" class="gold">End game</button>
          <button type="button" id="restart" class="danger">Restart game</button>
        </div>
        <div class="row">
          <label><input type="checkbox" id="focusBoard" ${state.focusBoard !== false ? "checked" : ""}> Bring board to front on each update</label>
          <label><input type="checkbox" id="hopBack" ${state.hopBack !== false ? "checked" : ""}> Then return to host</label>
        </div>
        <div class="row">
          <label>Team A <input type="text" id="nameA" value="${escapeAttr(state.nameA)}"></label>
          <label>Team B <input type="text" id="nameB" value="${escapeAttr(state.nameB)}"></label>
        </div>
        <div class="scores-mini">${escapeHtml(state.nameA)} <strong>${state.scoreA}</strong>
          &nbsp;·&nbsp; Round <strong>${rawRoundPoints()}</strong>${multiplier() > 1 ? " × " + multiplier() + " = <strong>" + roundPoints() + "</strong>" : ""}
          &nbsp;·&nbsp; ${escapeHtml(state.nameB)} <strong>${state.scoreB}</strong>
          ${state.roundAwarded ? " · awarded to " + (state.awardedTo === "A" ? state.nameA : state.nameB) : ""}
          ${state.scoreA >= 500 || state.scoreB >= 500 ? " · <span class='warn'>500 reached</span>" : ""}
        </div>
        <div class="row">
          <label>Round multiplier</label>
          <button type="button" data-mult="1" class="${multiplier() === 1 ? "gold" : ""}" ${state.roundAwarded ? "disabled" : ""}>1x</button>
          <button type="button" data-mult="2" class="${multiplier() === 2 ? "gold" : ""}" ${state.roundAwarded ? "disabled" : ""}>2x</button>
          <button type="button" data-mult="3" class="${multiplier() === 3 ? "gold" : ""}" ${state.roundAwarded ? "disabled" : ""}>3x</button>
        </div>
        <p class="hint">Backups (off the shuffle until checked)</p>
        <div class="backups">${backups}</div>
        <div class="row">
          <button type="button" id="next">${state.boardId || state.pendingId ? "Next round (random)" : "Start / random board"}</button>
          <select id="jump">${opts}</select>
        </div>
        ${
          pending
            ? `<div class="pending"><strong>Up next: ${pending.id}</strong><br>${escapeHtml(pending.question)}<br>
               <em>${escapeHtml(pending.source)}</em><br>
               <button type="button" id="show" class="gold" style="margin-top:8px">Show question</button></div>`
            : ""
        }
        ${
          b
            ? `<p><strong>${b.id}</strong> — ${escapeHtml(b.question)}<br><em>${escapeHtml(b.source)}</em></p>
               <div class="answers">${ans}</div>
               <div class="row">
                 <button type="button" id="strike" class="danger">Strike / not on board (X)</button>
                 <button type="button" id="undo">Undo</button>
                 <button type="button" id="left">Reveal leftovers</button>
               </div>
               <div class="row">
                 <button type="button" id="awardA" ${state.roundAwarded ? "disabled" : ""}>Award round to ${escapeHtml(state.nameA)}</button>
                 <button type="button" id="awardB" ${state.roundAwarded ? "disabled" : ""}>Award round to ${escapeHtml(state.nameB)}</button>
               </div>
               <p class="hint">Award the round, then reveal leftovers (leftovers do not add points). Strikes: ${state.strikes} / 3 ${state.strikes >= 3 ? "— steal is open. If they miss, award the family that was playing." : ""}</p>`
            : `<p class="hint">${rem.length ? "Pick Start / random, then Show question." : "No boards left in the pool. Restart or enable a backup."}</p>`
        }
      </div>
    `;

    document.getElementById("open-board").onclick = () => {
      const url = new URL("board.html", location.href);
      boardWin = window.open(
        url.href,
        "tw-feud-board",
        "popup=yes,width=1280,height=800,menubar=no,toolbar=no,location=no,status=no"
      );
      if (!boardWin) alert("Pop-up blocked. Allow pop-ups, then click Open audience board again.");
      else {
        try {
          boardWin.focus();
        } catch (_) {}
        setTimeout(() => pushToBoard(false), 400);
      }
    };
    document.getElementById("sounds").onchange = (e) => patch({ soundsOn: e.target.checked });
    document.getElementById("focusBoard").onchange = (e) => patch({ focusBoard: e.target.checked });
    document.getElementById("hopBack").onchange = (e) => patch({ hopBack: e.target.checked });
    document.getElementById("end-game").onclick = endGame;
    document.getElementById("restart").onclick = restart;
    document.getElementById("nameA").onchange = (e) => patch({ nameA: e.target.value || "Family A" });
    document.getElementById("nameB").onchange = (e) => patch({ nameB: e.target.value || "Family B" });
    document.getElementById("next").onclick = nextRound;
    document.getElementById("jump").onchange = (e) => {
      if (e.target.value) patch({ pendingId: e.target.value });
    };
    document.querySelectorAll("[data-backup]").forEach((el) => {
      el.onchange = () => {
        const backups = Object.assign({}, state.backups, { [el.getAttribute("data-backup")]: el.checked });
        patch({ backups });
      };
    });
    const show = document.getElementById("show");
    if (show) show.onclick = showQuestion;
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.onclick = () => reveal(Number(el.getAttribute("data-reveal")));
    });
    const st = document.getElementById("strike");
    if (st) st.onclick = strike;
    const u = document.getElementById("undo");
    if (u) u.onclick = undo;
    const left = document.getElementById("left");
    if (left) left.onclick = leftovers;
    const aA = document.getElementById("awardA");
    if (aA) aA.onclick = () => award("A");
    const aB = document.getElementById("awardB");
    if (aB) aB.onclick = () => award("B");
    document.querySelectorAll("[data-mult]").forEach((el) => {
      el.onclick = () => {
        if (state.roundAwarded) return;
        patch({ multiplier: Number(el.getAttribute("data-mult")) });
      };
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }

  render();
})();
