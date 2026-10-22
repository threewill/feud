(function () {
  const VIEW =
    window.TW_FEUD_VIEW ||
    new URLSearchParams(location.search).get("view") ||
    (location.hash === "#board" ? "board" : "host");

  let pack = null;
  let KEY = "feud-state-v1";
  let CHANNEL = "feud";
  let BOARDS = [];
  let byId = {};

  let state = null;
  let overlayTimer = null;
  let boardWin = null;
  let boardArmed = VIEW !== "board";
  let hopTimer = null;
  let audioCtx = null;
  let channel = null;
  let lastEventT = 0;
  let lastStored = "";
  const dingEl = new Audio("sounds/ding.wav");
  const buzzEl = new Audio("sounds/buzzer.wav");
  dingEl.preload = "auto";
  buzzEl.preload = "auto";

  function title() {
    return (pack && pack.title) || "Feud";
  }

  function families() {
    const f = (pack && pack.families) || {};
    return { a: f.a || "Family A", b: f.b || "Family B" };
  }

  function winCfg() {
    return (pack && pack.win) || { targetPoints: 500, hostCanEnd: true, onTarget: "endAndMaybeLightning" };
  }

  function lightningCfg() {
    const l = (pack && pack.lightning) || {};
    return {
      enabled: !!l.enabled,
      target: l.target || 200,
      player1Seconds: l.player1Seconds || 15,
      player2Seconds: l.player2Seconds || 20,
      steal: l.steal !== false,
      questions: Array.isArray(l.questions) ? l.questions : [],
    };
  }

  function lightningOn() {
    const l = lightningCfg();
    return l.enabled && l.questions.length > 0;
  }

  function emptyLightning() {
    const n = lightningCfg().questions.length;
    return {
      family: null,
      player: 1,
      q: 0,
      running: false,
      endsAt: null,
      p1: Array(n).fill(null),
      p2: Array(n).fill(null),
      stealOpen: false,
      stealQ: null,
      stealHit: null,
    };
  }

  function defaultState() {
    const fam = families();
    return {
      nameA: fam.a,
      nameB: fam.b,
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
      phase: "main",
      lightning: emptyLightning(),
    };
  }

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

  function targetPoints() {
    const t = winCfg().targetPoints;
    return t == null ? null : Number(t);
  }

  function hitTarget(scoreA, scoreB) {
    const t = targetPoints();
    return t != null && (scoreA >= t || scoreB >= t);
  }

  function leaderFamily(scoreA, scoreB) {
    if (scoreA > scoreB) return "A";
    if (scoreB > scoreA) return "B";
    return null;
  }

  function familyName(which) {
    return which === "B" ? state.nameB : state.nameA;
  }

  function nextRound() {
    if (state.phase !== "main") return;
    const played = state.played.slice();
    if (state.boardId && !played.includes(state.boardId)) played.push(state.boardId);
    const used = new Set(played);
    const pool = enabledIds().filter((id) => !used.has(id));
    if (!pool.length) {
      patch({
        played,
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
      played,
      pendingId,
      boardId: null,
      revealed: [],
      leftover: [],
      strikes: 0,
      overlay: null,
      overlayText: "",
      overlaySticky: false,
      roundAwarded: false,
      awardedTo: null,
      multiplier: 1,
      history: [],
    });
  }

  function showQuestion() {
    if (!state.pendingId || state.phase !== "main") return;
    const b = byId[state.pendingId];
    patch({
      boardId: state.pendingId,
      pendingId: null,
      revealed: b.answers.map(() => false),
      leftover: b.answers.map(() => false),
      strikes: 0,
      overlay: null,
      overlaySticky: false,
      roundAwarded: false,
      awardedTo: null,
      multiplier: 1,
      history: [],
      clockStartedAt: state.clockStartedAt || Date.now(),
    });
  }

  function reveal(i) {
    const b = board();
    if (!b || state.phase !== "main" || state.revealed[i] || state.roundAwarded) return;
    const revealed = state.revealed.slice();
    revealed[i] = true;
    const history = state.history.concat([{ type: "reveal", i }]);
    const event = { t: Date.now(), kind: "ding", i };
    patch({ revealed, history, event });
    play("ding");
  }

  function strike() {
    if (!board() || state.phase !== "main" || state.roundAwarded) return;
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

  function declareWinner(scoreA, scoreB, extra) {
    const who = leaderFamily(scoreA, scoreB);
    let line;
    if (who === "A") line = state.nameA + " WINS!";
    else if (who === "B") line = state.nameB + " WINS!";
    else line = "IT'S A TIE!";
    const next = Object.assign(
      {
        overlay: "win",
        overlayText: line + "\n" + scoreA + " – " + scoreB,
        overlaySticky: true,
        phase: "done",
      },
      extra || {}
    );
    patch(next);
  }

  function beginLightning(family) {
    const L = emptyLightning();
    L.family = family;
    patch({
      phase: "lightning",
      overlay: "win",
      overlayText: familyName(family) + "\nLIGHTNING ROUND",
      overlaySticky: true,
      lightning: L,
    });
  }

  function maybeFinishOrLightning(scoreA, scoreB) {
    const who = leaderFamily(scoreA, scoreB);
    if (lightningOn()) {
      if (!who) {
        patch({
          overlay: "win",
          overlayText: "IT'S A TIE!\nHost picks a family for lightning",
          overlaySticky: true,
          phase: "lightning-pick",
        });
        return;
      }
      beginLightning(who);
      return;
    }
    declareWinner(scoreA, scoreB);
  }

  function endGame() {
    if (!winCfg().hostCanEnd) return;
    maybeFinishOrLightning(state.scoreA, state.scoreB);
  }

  function undo() {
    if (state.phase !== "main") return;
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
      patch({ scoreA, scoreB, roundAwarded: false, awardedTo: null, overlay: null, overlaySticky: false, history });
    }
  }

  function leftovers() {
    const b = board();
    if (!b || state.phase !== "main") return;
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
    if (!board() || state.phase !== "main" || state.roundAwarded) return;
    const pts = roundPoints();
    const scoreA = to === "A" ? state.scoreA + pts : state.scoreA;
    const scoreB = to === "B" ? state.scoreB + pts : state.scoreB;
    const win = hitTarget(scoreA, scoreB);
    const onTarget = winCfg().onTarget || "endAndMaybeLightning";
    if (win && onTarget === "endAndMaybeLightning") {
      patch({
        scoreA,
        scoreB,
        roundAwarded: true,
        awardedTo: to,
        history: state.history.concat([{ type: "award", to, pts }]),
      });
      maybeFinishOrLightning(scoreA, scoreB);
      return;
    }
    patch({
      scoreA,
      scoreB,
      roundAwarded: true,
      awardedTo: to,
      overlay: win ? "win" : null,
      overlayText: win ? familyName(leaderFamily(scoreA, scoreB)) + " WINS!" : "",
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

  function lightningSlot(player, i) {
    const L = state.lightning || emptyLightning();
    return player === 2 ? L.p2[i] : L.p1[i];
  }

  function lightningPts(slot, q) {
    if (slot == null || slot === "x") return 0;
    const ans = lightningCfg().questions[q];
    if (!ans || !ans.answers[slot]) return 0;
    return ans.answers[slot].pts;
  }

  function lightningTotal() {
    const qs = lightningCfg().questions;
    const L = state.lightning || emptyLightning();
    let sum = 0;
    qs.forEach((_, i) => {
      sum += lightningPts(L.p1[i], i);
      sum += lightningPts(L.p2[i], i);
    });
    if (L.stealHit != null && L.stealHit !== false && L.stealQ != null) {
      sum += lightningPts(L.stealHit, L.stealQ);
    }
    return sum;
  }

  function startLightningPlayer() {
    const cfg = lightningCfg();
    const L = Object.assign({}, state.lightning);
    const secs = L.player === 2 ? cfg.player2Seconds : cfg.player1Seconds;
    L.running = true;
    L.endsAt = Date.now() + secs * 1000;
    L.q = L.p1.findIndex ? (L.player === 2 ? L.p2.findIndex((x) => x == null) : L.p1.findIndex((x) => x == null)) : 0;
    if (L.q < 0) L.q = 0;
    patch({ lightning: L, overlay: null, overlaySticky: false });
  }

  function recordLightning(slot) {
    const cfg = lightningCfg();
    const L = Object.assign({}, state.lightning, { p1: state.lightning.p1.slice(), p2: state.lightning.p2.slice() });
    if (!L.running && state.phase === "lightning") {
      /* allow host to record even if they forgot start, but prefer running */
    }
    const arr = L.player === 2 ? L.p2 : L.p1;
    if (arr[L.q] != null) return;
    if (L.player === 2 && slot !== "x" && L.p1[L.q] === slot) {
      slot = "x";
      play("buzz");
    } else if (slot === "x") {
      play("buzz");
    } else {
      play("ding");
    }
    arr[L.q] = slot;
    L.q += 1;
    const event = { t: Date.now(), kind: slot === "x" ? "buzz" : "ding" };
    if (L.q >= cfg.questions.length) {
      L.running = false;
      L.endsAt = null;
      if (L.player === 1) {
        L.player = 2;
        L.q = 0;
        patch({ lightning: L, event, overlay: "win", overlayText: "PLAYER 2", overlaySticky: false });
        scheduleOverlayClear();
        return;
      }
      finishLightningScoring(L, event);
      return;
    }
    patch({ lightning: L, event });
  }

  function finishLightningScoring(L, event) {
    const cfg = lightningCfg();
    const tmp = { lightning: L };
    const prev = state.lightning;
    state.lightning = L;
    const total = lightningTotal();
    state.lightning = prev;
    if (total >= cfg.target) {
      L.stealOpen = false;
      patch({
        lightning: L,
        phase: "done",
        overlay: "win",
        overlayText: familyName(L.family) + "\nLIGHTNING " + total,
        overlaySticky: true,
        event: event || { t: Date.now(), kind: "ding" },
      });
      return;
    }
    if (cfg.steal) {
      L.stealOpen = true;
      L.running = false;
      patch({
        lightning: L,
        overlay: "win",
        overlayText: total + " — STEAL IS OPEN",
        overlaySticky: true,
        event: event || { t: Date.now(), kind: "buzz" },
      });
      return;
    }
    patch({
      lightning: L,
      phase: "done",
      overlay: "win",
      overlayText: "LIGHTNING " + total + "\nNO STEAL",
      overlaySticky: true,
      event: event || { t: Date.now(), kind: "buzz" },
    });
  }

  function stealGuess(hit) {
    const L = Object.assign({}, state.lightning);
    if (!L.stealOpen || L.stealQ == null) return;
    L.stealHit = hit;
    L.stealOpen = false;
    const cfg = lightningCfg();
    state.lightning = L;
    const total = lightningTotal();
    if (hit !== false && total >= cfg.target) {
      patch({
        lightning: L,
        phase: "done",
        overlay: "win",
        overlayText: familyName(L.family === "A" ? "B" : "A") + " STEALS\n" + total,
        overlaySticky: true,
        event: { t: Date.now(), kind: "ding" },
      });
      play("ding");
      return;
    }
    patch({
      lightning: L,
      phase: "done",
      overlay: "win",
      overlayText: familyName(L.family) + "\nLIGHTNING " + total,
      overlaySticky: true,
      event: { t: Date.now(), kind: hit === false ? "buzz" : "ding" },
    });
    play(hit === false ? "buzz" : "ding");
  }

  function expireLightningIfNeeded() {
    const L = state.lightning;
    if (!L || !L.running || !L.endsAt) return;
    if (Date.now() < L.endsAt) return;
    const cfg = lightningCfg();
    const next = Object.assign({}, L, { p1: L.p1.slice(), p2: L.p2.slice(), running: false, endsAt: null });
    const arr = next.player === 2 ? next.p2 : next.p1;
    for (let i = 0; i < cfg.questions.length; i++) {
      if (arr[i] == null) arr[i] = "x";
    }
    next.q = cfg.questions.length;
    if (next.player === 1) {
      next.player = 2;
      next.q = 0;
      patch({ lightning: next, overlay: "win", overlayText: "TIME\nPLAYER 2", overlaySticky: false, event: { t: Date.now(), kind: "buzz" } });
      play("buzz");
      scheduleOverlayClear();
      return;
    }
    finishLightningScoring(next, { t: Date.now(), kind: "buzz" });
  }

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
      rtc.createDataChannel("feud-keep");
      rtc.createOffer().then((o) => rtc.setLocalDescription(o)).catch(() => {});
    } catch (_) {}
    try {
      if (navigator.wakeLock) navigator.wakeLock.request("screen");
    } catch (_) {}
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

  function formatLightningTimer() {
    const L = state.lightning;
    if (!L || !L.running || !L.endsAt) return "";
    const s = Math.max(0, Math.ceil((L.endsAt - Date.now()) / 1000));
    return String(s);
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
    if (!state) return;
    if (VIEW === "board") renderBoard();
    else renderHost();
  }

  function lightningAnswerLabel(slot, q) {
    if (slot == null) return "";
    if (slot === "x") return "—";
    const ans = lightningCfg().questions[q];
    return ans && ans.answers[slot] ? ans.answers[slot].text : "";
  }

  function renderBoard() {
    if (
      state.phase === "lightning" ||
      (state.phase === "done" && state.lightning && state.lightning.family)
    ) {
      renderLightningBoard();
      return;
    }

    const b = board();
    const n = b ? b.answers.length : 0;
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
    const rowMajor = [];
    for (let row = 0; row < perCol; row++) {
      rowMajor.push(cells[row]);
      rowMajor.push(cells[perCol + row]);
    }

    const q = b ? b.question : state.pendingId ? "Survey says…" : title();
    const overlayClass = state.overlay ? "overlay show" : "overlay";
    const overlayInner =
      state.overlay === "win" || state.overlay === "steal"
        ? `<div class="msg">${escapeHtml(state.overlayText || "").replace(/\n/g, "<br>")}</div>`
        : `<div class="x">${escapeHtml(state.overlayText || "")}</div>`;

    document.body.className = "board-body";
    document.title = title() + " — Audience";
    document.body.innerHTML = `
      <div class="logo">${escapeHtml(title().toUpperCase())}</div>
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

  function renderLightningBoard() {
    const qs = lightningCfg().questions;
    const L = state.lightning || emptyLightning();
    const rows = qs
      .map((q, i) => {
        const a1 = lightningSlot(1, i);
        const a2 = lightningSlot(2, i);
        const show1 = a1 != null;
        const show2 = a2 != null;
        return `<div class="lightning-row">
          <div class="qnum">${i + 1}</div>
          <div class="ans">${show1 ? escapeHtml(lightningAnswerLabel(a1, i)) : ""}</div>
          <div class="lp">${show1 ? lightningPts(a1, i) : ""}</div>
          <div class="ans">${show2 ? escapeHtml(lightningAnswerLabel(a2, i)) : ""}</div>
          <div class="lp">${show2 ? lightningPts(a2, i) : ""}</div>
        </div>`;
      })
      .join("");
    const overlayClass = state.overlay ? "overlay show" : "overlay";
    const overlayInner =
      state.overlay === "win" || state.overlay === "steal"
        ? `<div class="msg">${escapeHtml(state.overlayText || "").replace(/\n/g, "<br>")}</div>`
        : `<div class="x">${escapeHtml(state.overlayText || "")}</div>`;
    const timer = formatLightningTimer();
    document.body.className = "board-body";
    document.title = title() + " — Audience";
    document.body.innerHTML = `
      <div class="logo">${escapeHtml(title().toUpperCase())}</div>
      <div class="scorebar">
        <div class="family a"><span class="name">${escapeHtml(state.nameA)}</span><span class="score">${state.scoreA}</span></div>
        <div class="round-pts">
          <div class="lbl">LIGHTNING</div>
          <div class="val">${lightningTotal()}</div>
          <div class="mult">GOAL ${lightningCfg().target}</div>
        </div>
        <div class="family b"><span class="name">${escapeHtml(state.nameB)}</span><span class="score">${state.scoreB}</span></div>
      </div>
      <div class="question">${escapeHtml(familyName(L.family || "A"))} — PLAYER ${L.player}</div>
      ${timer ? `<div class="lightning-timer" id="lt-clock">${timer}</div>` : ""}
      <div class="lightning-rows">${rows}</div>
      <div class="${overlayClass}">${overlayInner}</div>
      <div class="game-clock" id="game-clock">${formatClock()}</div>
      ${
        boardArmed
          ? ""
          : `<div id="arm" class="overlay show"><div class="msg">CLICK ONCE<br><span style="font-size:32px;letter-spacing:0.04em">so Edge keeps this board awake</span></div></div>`
      }
    `;
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
    document.title = title() + " — Host";
    if (state.phase === "lightning-pick") {
      renderLightningPickHost();
      return;
    }
    if (state.phase === "lightning" || (state.lightning && state.lightning.stealOpen)) {
      renderLightningHost();
      return;
    }
    if (state.phase === "done") {
      renderDoneHost();
      return;
    }

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
    const t = targetPoints();
    const reached = t != null && (state.scoreA >= t || state.scoreB >= t);

    document.body.className = "host-body";
    document.body.innerHTML = `
      <div class="host">
        <h1>Host — ${escapeHtml(title())}</h1>
        <p class="hint">Opens a <strong>separate window</strong> (what Teams can share). Each reveal/strike brings that window to the front so Edge redraws, then hops back here so you can keep clicking. Pack: <code>?pack=</code> or config.json.</p>
        <div class="row">
          <button type="button" id="open-board" class="gold">Open audience board</button>
          <label><input type="checkbox" id="sounds" ${state.soundsOn ? "checked" : ""}> Sounds</label>
          ${winCfg().hostCanEnd ? `<button type="button" id="end-game" class="gold">End game</button>` : ""}
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
          ${reached ? " · <span class='warn'>" + t + " reached</span>" : ""}
          ${lightningOn() ? " · lightning on" : ""}
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
               <em>${escapeHtml(pending.source || "")}</em><br>
               <button type="button" id="show" class="gold" style="margin-top:8px">Show question</button></div>`
            : ""
        }
        ${
          b
            ? `<p><strong>${b.id}</strong> — ${escapeHtml(b.question)}<br><em>${escapeHtml(b.source || "")}</em></p>
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
    bindHostChrome();
    document.getElementById("next").onclick = nextRound;
    document.getElementById("jump").onchange = (e) => {
      if (e.target.value) patch({ pendingId: e.target.value });
    };
    document.querySelectorAll("[data-backup]").forEach((el) => {
      el.onchange = () => {
        const backupsState = Object.assign({}, state.backups, { [el.getAttribute("data-backup")]: el.checked });
        patch({ backups: backupsState });
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

  function bindHostChrome() {
    document.getElementById("open-board").onclick = () => {
      const url = new URL("board.html", location.href);
      const packQ = new URLSearchParams(location.search).get("pack");
      if (packQ) url.searchParams.set("pack", packQ);
      boardWin = window.open(
        url.href,
        "feud-board",
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
    const end = document.getElementById("end-game");
    if (end) end.onclick = endGame;
    document.getElementById("restart").onclick = restart;
    const nA = document.getElementById("nameA");
    const nB = document.getElementById("nameB");
    if (nA) nA.onchange = (e) => patch({ nameA: e.target.value || families().a });
    if (nB) nB.onchange = (e) => patch({ nameB: e.target.value || families().b });
  }

  function renderLightningPickHost() {
    document.body.className = "host-body";
    document.body.innerHTML = `
      <div class="host">
        <h1>Host — ${escapeHtml(title())}</h1>
        <p class="hint">Scores are tied. Pick which family plays lightning.</p>
        <div class="row">
          <button type="button" id="open-board" class="gold">Open audience board</button>
          <label><input type="checkbox" id="sounds" ${state.soundsOn ? "checked" : ""}> Sounds</label>
          <button type="button" id="restart" class="danger">Restart game</button>
        </div>
        <div class="row">
          <label><input type="checkbox" id="focusBoard" ${state.focusBoard !== false ? "checked" : ""}> Bring board to front on each update</label>
          <label><input type="checkbox" id="hopBack" ${state.hopBack !== false ? "checked" : ""}> Then return to host</label>
        </div>
        <div class="row">
          <button type="button" id="pickA" class="gold">Lightning: ${escapeHtml(state.nameA)}</button>
          <button type="button" id="pickB" class="gold">Lightning: ${escapeHtml(state.nameB)}</button>
        </div>
      </div>`;
    bindHostChrome();
    document.getElementById("pickA").onclick = () => beginLightning("A");
    document.getElementById("pickB").onclick = () => beginLightning("B");
  }

  function renderDoneHost() {
    document.body.className = "host-body";
    document.body.innerHTML = `
      <div class="host">
        <h1>Host — ${escapeHtml(title())}</h1>
        <p class="hint">Show is over. Restart for a new game.</p>
        <div class="row">
          <button type="button" id="open-board" class="gold">Open audience board</button>
          <label><input type="checkbox" id="sounds" ${state.soundsOn ? "checked" : ""}> Sounds</label>
          <button type="button" id="restart" class="danger">Restart game</button>
        </div>
        <div class="row">
          <label><input type="checkbox" id="focusBoard" ${state.focusBoard !== false ? "checked" : ""}> Bring board to front on each update</label>
          <label><input type="checkbox" id="hopBack" ${state.hopBack !== false ? "checked" : ""}> Then return to host</label>
        </div>
        <div class="scores-mini">${escapeHtml(state.nameA)} <strong>${state.scoreA}</strong>
          &nbsp;·&nbsp; ${escapeHtml(state.nameB)} <strong>${state.scoreB}</strong>
          ${state.lightning && state.lightning.family ? " · lightning " + lightningTotal() : ""}
        </div>
      </div>`;
    bindHostChrome();
  }

  function renderLightningHost() {
    const cfg = lightningCfg();
    const L = state.lightning || emptyLightning();
    const q = cfg.questions[L.q] || cfg.questions[0];
    const used = L.player === 2 && q ? new Set([L.p1[L.q]].filter((x) => x != null && x !== "x")) : new Set();
    const ansBtns = q
      ? q.answers
          .map((a, i) => {
            const taken = used.has(i);
            return `<button class="ans" data-lans="${i}" ${taken ? "disabled" : ""}><span class="p">${a.pts}</span><span>${i + 1}. ${escapeHtml(a.text)}</span></button>`;
          })
          .join("")
      : "";
    const stealQs = cfg.questions
      .map((qq, i) => {
        const missed = L.p1[i] === "x" && L.p2[i] === "x";
        return missed
          ? `<button type="button" data-stealq="${i}" class="${L.stealQ === i ? "gold" : ""}">${i + 1}. ${escapeHtml(qq.question.slice(0, 60))}</button>`
          : "";
      })
      .join("");

    document.body.className = "host-body";
    document.body.innerHTML = `
      <div class="host lightning-host">
        <h1>Host — ${escapeHtml(title())} lightning</h1>
        <p class="hint">${escapeHtml(familyName(L.family))} · Player ${L.player} · ${lightningTotal()} / ${cfg.target}</p>
        <div class="row">
          <button type="button" id="open-board" class="gold">Open audience board</button>
          <label><input type="checkbox" id="sounds" ${state.soundsOn ? "checked" : ""}> Sounds</label>
          <button type="button" id="restart" class="danger">Restart game</button>
        </div>
        <div class="row">
          <label><input type="checkbox" id="focusBoard" ${state.focusBoard !== false ? "checked" : ""}> Bring board to front on each update</label>
          <label><input type="checkbox" id="hopBack" ${state.hopBack !== false ? "checked" : ""}> Then return to host</label>
        </div>
        ${
          L.stealOpen
            ? `<p class="hint">Steal: pick a missed question, then the other family's answer (or miss).</p>
               <div class="row">${stealQs || "<em>No double-misses to steal.</em>"}</div>
               ${stealQs ? "" : `<div class="row"><button type="button" id="skip-steal" class="gold">End lightning</button></div>`}
               ${
                 L.stealQ != null
                   ? `<div class="answers">${cfg.questions[L.stealQ].answers
                       .map(
                         (a, i) =>
                           `<button class="ans" data-stealans="${i}"><span class="p">${a.pts}</span><span>${escapeHtml(a.text)}</span></button>`
                       )
                       .join("")}<button type="button" id="steal-miss" class="danger">Not on board</button></div>`
                   : ""
               }`
            : `${
                !L.running
                  ? `<div class="row"><button type="button" id="start-lt" class="gold">Start player ${L.player} (${
                      L.player === 2 ? cfg.player2Seconds : cfg.player1Seconds
                    }s)</button></div>`
                  : `<p class="lightning-timer" id="lt-clock">${formatLightningTimer()}</p>`
              }
               <p class="q"><strong>Q${L.q + 1}.</strong> ${q ? escapeHtml(q.question) : ""}</p>
               <div class="answers">${ansBtns}</div>
               <div class="row"><button type="button" id="l-miss" class="danger">Not on board</button></div>`
        }
      </div>`;
    bindHostChrome();
    const start = document.getElementById("start-lt");
    if (start) start.onclick = startLightningPlayer;
    document.querySelectorAll("[data-lans]").forEach((el) => {
      el.onclick = () => recordLightning(Number(el.getAttribute("data-lans")));
    });
    const miss = document.getElementById("l-miss");
    if (miss) miss.onclick = () => recordLightning("x");
    document.querySelectorAll("[data-stealq]").forEach((el) => {
      el.onclick = () => {
        const lightning = Object.assign({}, state.lightning, { stealQ: Number(el.getAttribute("data-stealq")) });
        patch({ lightning });
      };
    });
    document.querySelectorAll("[data-stealans]").forEach((el) => {
      el.onclick = () => stealGuess(Number(el.getAttribute("data-stealans")));
    });
    const sm = document.getElementById("steal-miss");
    if (sm) sm.onclick = () => stealGuess(false);
    const skip = document.getElementById("skip-steal");
    if (skip)
      skip.onclick = () => {
        const L = Object.assign({}, state.lightning, { stealOpen: false });
        patch({
          lightning: L,
          phase: "done",
          overlay: "win",
          overlayText: familyName(L.family) + "\nLIGHTNING " + lightningTotal(),
          overlaySticky: true,
        });
      };
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

  async function loadPack() {
    const params = new URLSearchParams(location.search);
    let packUrl = params.get("pack");
    if (!packUrl) {
      const cfg = await fetch("config.json").then((r) => {
        if (!r.ok) throw new Error("Missing config.json (serve this folder over http, not file://).");
        return r.json();
      });
      packUrl = cfg.pack;
    }
    const res = await fetch(packUrl);
    if (!res.ok) throw new Error("Could not load pack " + packUrl);
    return res.json();
  }

  function setupSync() {
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (e) => {
        if (e.data && e.data.type === "state") applyRemote(e.data.state);
      };
    } catch (_) {}
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
  }

  function setupBoardPoll() {
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
      const lt = document.getElementById("lt-clock");
      if (lt) lt.textContent = formatLightningTimer();
      if (VIEW === "host") expireLightningIfNeeded();
    }, 120);
    window.TW_FEUD_APPLY = applyRemote;
  }

  loadPack()
    .then((p) => {
      pack = p;
      KEY = "feud-" + pack.id + "-v1";
      CHANNEL = "feud-" + pack.id;
      BOARDS = pack.boards || [];
      byId = Object.fromEntries(BOARDS.map((b) => [b.id, b]));
      state = load();
      setupSync();
      if (VIEW === "board") setupBoardPoll();
      else setInterval(() => {
        const lt = document.getElementById("lt-clock");
        if (lt) lt.textContent = formatLightningTimer();
        expireLightningIfNeeded();
      }, 200);
      render();
    })
    .catch((err) => {
      document.body.className = "host-body";
      document.body.innerHTML = `<div class="host"><h1>Could not load show pack</h1><p class="hint">${escapeHtml(
        err.message || String(err)
      )}</p><p class="hint">Run <code>npx serve</code> from this folder. Optional: <code>?pack=packs/october-qad.json</code></p></div>`;
    });
})();
