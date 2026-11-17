# ThreeWill Feud: cloud-prep context harvest

Checked against repo `main` at `01e97c8` (2026-10-24) and current `docs/` on the cloud-prep branch. Harvested 2026-11-17 (America/New_York). Public repo: `threewill/feud`. Default branch `main`.

**Sources:** Cursor chat “Team building exercise planning” (2026-09-29 through 2026-10-24) [C1]; plans P-qad, P-boards, P-remote, P-productize (verbatim under `docs/plans/`); git history [G]; repo files [R]. Shelf lookup found no existing record [S].

All times below are America/New_York. Secret **names** only; none of their values appear here. No respondent-level survey answers or emails. Shelf-facing text names no client.

**Corrections vs the 2026-11-17 draft** (also listed in the cloud-prep PR):

1. Runtime does **not** JSON-Schema-validate packs. `loadPack()` `fetch`es and parses JSON. `packs/schema.json` is the documented contract.
2. Sync is BroadcastChannel + `localStorage` **plus** `postMessage` to the popped-out board window and a 120 ms `localStorage` poll on the audience view.
3. Audience hop is **400 ms** (`setTimeout(..., 400)` in `pushToBoard`).
4. Importer tests cover Hamilton pie, unique-person collapse, and Forms headers / pack build — not a general clustering suite.
5. Product name in docs is **ThreeWill Feud** (D17). README previously titled the product “Feud”.
6. Draft open questions on name, pitch, roadmap, and “no CI in this PR” are decided (D17–D22).
7. Laptop clone path, `origin/HEAD` tracking nit, and Cursor DB key names are omitted (public repo).
8. Host screenshot confirmed stale: one **Strike / not on board (X)** button; no **Win at** / **Lightning round** row in the shot.
9. CSV import with the same header names is supported (`docs/pack-spec.md`).
10. Before a pack loads, keys default to `feud-state-v1` / channel `feud`; after load they are `feud-{pack.id}-v1` and `feud-{pack.id}`.
11. Lightning checkbox is **disabled** when the pack has no lightning questions (`hasLightningQuestions()`).
12. Live QAD use (2026-10-15) and the leftover snapshot in another repo were **not** re-verified from this clone.

---

## 1. Purpose and users

- **What it is:** A local **host + audience** board for a Family Feud–style show. The host drives the game from a private page; the room sees a separate window shared into Teams or onto a projector. Show data is a **JSON pack** on disk. [R README, C1]
- **How it started:** Planning a team-building exercise for ThreeWill’s Quarterly All-Day (QAD) on Thursday 2026-10-15. The seed was a “Corporate Feud” with survey-ranked answers, strikes, and a steal — a reusable board, not a one-off slide deck. [C1 2026-09-29]
- **Users:**
  - A **host** (facilitator) on one machine: private answer list, strike/award controls, optional lightning.
  - An **audience** watching the shared board (room or Teams).
  - Later, **any team** with a Microsoft Forms (or CSV) survey that can become a pack. [C1, README]
- **History:**
  - 2026-09-29 to 10-13: QAD runbook, Forms survey, and clustered boards lived in another internal repo.
  - 2026-10-14: local two-window static board the day before QAD (physical buzzers, no PowerPoint). [P-remote]
  - 2026-10-15: used live at QAD (from chat; not in this git history).
  - 2026-10-22: productized into public `threewill/feud` — pack loader, optional lightning, Forms importer, pytest. [P-productize, G]
  - 2026-10-24: MIT license, gameplay README, host/audience screenshots. [G]

**Not** official Family Feud. No licensed logos or sound rips. [README, AGENTS.md]

---

## 2. Architecture and stack

- **Runtime:** static `index.html` (host), `board.html` (audience), `app.js`, `styles.css`. No npm build, no framework, no server of its own. `npx serve .` then open the printed URL. `file://` cannot `fetch` packs. [README]
- **Pack loading:** `config.json` names the default pack (`packs/october-qad.json`), or `?pack=packs/yours.json`. `packs/schema.json` documents the shape; `docs/pack-spec.md` explains fields. The app does not run a schema validator at load time. After load, storage and BroadcastChannel are `feud-{pack.id}-v1` and `feud-{pack.id}`. [app.js ~1305–1306]
- **Sync:** BroadcastChannel, `localStorage`, `postMessage` to the board window, and a 120 ms storage poll on the audience view. A 400 ms “audience hop” focuses the board so Edge will repaint under Teams window-share, then returns focus to the host. Host can uncheck `focusBoard` / `hopBack`.
- **Views:** `index.html` sets `TW_FEUD_VIEW = "host"`; `board.html` sets `"board"`. `?view=` / `#board` are fallbacks in `app.js`. **Open audience board** opens `board.html` in a **separate window**.
- **Sounds:** `sounds/ding.wav` and `sounds/buzzer.wav`, synthesized CC0-style stand-ins (citations in `sounds/README.md`). Played on the **host** PC. Mute toggle on the host page.
- **Importer:** `python -m feudpack import …`. Depends on `openpyxl` and `rapidfuzz`. Clusters similar answers, unique-person collapse, Hamilton pie to 100, writes pack JSON plus a sibling `.review.md` (gitignored). Tests: `python -m pytest -q`.
- **Sample pack:** `packs/october-qad.json` — id `october-qad`, title “ThreeWill Feud”, 10 live + 6 backup boards, win at 500, End game on, five lightning questions, `lightning.enabled: false`.
- **Telemetry:** none. Exception vs the usual ThreeWill Application Insights default. [AGENTS.md]
- **License:** MIT, Copyright 2026 ThreeWill. [LICENSE, `693c5ae`]

---

## 3. Key decisions

See [docs/decisions/DECISION-LOG.md](../decisions/DECISION-LOG.md) (D01–D22). Highlights for agents: local two-window static site (D04); no official assets (D05); pack-driven product (D11); host overrides for win/lightning (D12); Showdown X vs Family play X (D13); public MIT repo (D14–D15); product name **ThreeWill Feud** (D17); no CI in the cloud-prep PR (D20); copy-and-sync standards, not a submodule (D21).

---

## 4. Conventions

- Show data is a **pack JSON**, never hardcoded `boards.js` in this repo. Edit cluster labels in the JSON after reviewing `*.review.md`.
- Serve over HTTP (`npx serve`). Do not double-click the HTML.
- Pack `win` / `lightning` are defaults; the host can change **Win at** and the lightning checkbox live. [D12]
- Showdown X must not increment the 3-strike count. [D13]
- Tests for the importer: `python -m pytest -q`. There are no JS tests.
- Do not ship official Family Feud logos or sounds.
- New shows use **this** repo. An older QAD snapshot may still exist elsewhere; it is not this product.

---

## 5. Known pitfalls and fixes

- **`file://` cannot fetch packs.** Always `npx serve`.
- **Edge / Teams window-share does not repaint a background tab.** Use the audience hop, or focus the board window yourself.
- **“Open audience board” must be a separate window.** Allow pop-ups.
- **Sounds play on the host PC**, not in the shared window.
- **Buzzers are not in the app.** Physical buzzers or blurt; the host judges the face-off and clicks.
- **Hand-clustered labels will not match the importer 1:1.** The pack JSON is what the board plays.
- **Host screenshot is stale.** `docs/screenshots/host.png` still shows a single Strike button (UX-01). Audience screenshot is still usable.

---

## 6. Open issues

- **No Shelf record yet.** Create one after this PR (Mike). Do not write Dataverse from an agent unless asked.
- **Sample pack is internal QAD content** on a public repo (accepted 2026-10-24, D15). A generic sample pack is **Next** (FEAT-01); the October pack stays for now (D19).
- **Host screenshot should be retaken** (UX-01, Now, backlog only).
- **No JS tests and no CI.** Importer tests are local only (TD-02).
- **No hosted demo URL.** Product is run locally (FEAT-03, Later).
- **No automatic product version / tags.** 0.1.0 is assigned retroactively (D22, TD-03).
- Plan file `productize_feud_repo_d66fe29b.plan.md` still shows some todos as in_progress/pending; the work shipped. Cosmetic only.

---

## 7. Environments and deployment

See [docs/ops/ENVIRONMENTS.md](../ops/ENVIRONMENTS.md).

- **Run:** Node is only needed for `npx serve .`. Open the host URL, allow pop-ups, open the audience board, share that window.
- **Importer:** Python 3, `pip install -r requirements.txt`, then `python -m feudpack import "Survey.xlsx" -o packs/myshow.json --id myshow --title "Our Feud"`.
- **No cloud environment, no app registration, no tenant install, no secrets.**

---

## 8. Glossary

- **Pack:** one JSON show file (title, family names, boards, win rules, optional lightning).
- **Live / backup pool:** live boards are in the random shuffle; backups stay out until the host checks them in.
- **Pie:** answer points as a share of 100 (Hamilton remainder), after unique-person collapse.
- **Showdown X:** face-off miss. Visual X only; not a family strike.
- **Family play X:** miss after a family is playing; counts toward three, then steal.
- **Lightning / Fast Money:** optional end-game, host-timed, pack-driven; default off in the October sample.
- **Audience hop:** 400 ms focus of the board window so Edge repaints, then return to the host.
- **QAD:** ThreeWill Quarterly All-Day, first live use (2026-10-15).

---

## 9. Stale or conflicting docs

- README and pack-spec match the code at `01e97c8` for gameplay (including showdown vs family-play X, host win/lightning overrides, Forms import). README title is updated to **ThreeWill Feud** on this branch.
- **Host screenshot conflicts with current UI** (single Strike vs two buttons; missing Win at / Lightning).
- Historical plans under `docs/plans/` are superseded as noted in `docs/plans/README.md`.
- An older snapshot in another repo is pre-pack, win-at-500 hardcoded, no lightning. Expected leftover, not a feud-repo bug.

---

## 10. Shelf

Confirmed name: **ThreeWill Feud**. Pitch and features: root `Shelf-Details.md`. No client names. No `tw_shelfitem` existed as of 2026-11-17 [S]. Mike creates the Shelf record after merge. Suggested `tw_link`: `https://github.com/threewill/feud`. There is no hosted demo URL.

---

## 11. Features and changelog

See [docs/FEATURES.md](../FEATURES.md). Version **0.1.0** = public state at `01e97c8` (2026-10-24).

---

## 12. Backlog and roadmap

See [roadmap/BACKLOG.md](../../roadmap/BACKLOG.md) and [roadmap/ROADMAP.md](../../roadmap/ROADMAP.md). Horizons (D19): Now / Next / Later / Parked.

---

## 13. Still only Mike

- Shelf information state and primary SME.
- Whether this repo joins the Monday standards sync (copy-and-sync, not submodule).
- Merge of this docs PR.
- Retake of `docs/screenshots/host.png` (UX-01) when convenient.
