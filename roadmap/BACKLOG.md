# ThreeWill Feud — backlog

Horizons: **Proposed** / **Now** / **Next** / **Later** / **Parked**.  
Tags: **Area**, **Driver**, **Type**. Bugs also get **Severity**.  
IDs: `FEAT-nn`, `BUG-nn`, `TD-nn`, `UX-nn`.  
Dates are America/New_York.

Publishable Now/Next/Later: [ROADMAP.md](ROADMAP.md).

## Now

### TD-01 — Cloud-prep product docs

- **Horizon:** Now (this PR)
- **Area:** Docs
- **Driver:** Cloud agents + Shelf
- **Type:** Tech debt
- **Source:** Cloud-prep harvest, 2026-11-17
- **Date:** 2026-11-17
- **Notes:** Shelf-Details, FEATURES, backlog, roadmap, decision log, standards copy, PR template, regression starter, AGENTS.md expansion. Shipped on branch `docs/cloud-prep`; leave open until Mike merges.

### UX-01 — Retake host screenshot

- **Horizon:** Now (backlog only; not in this PR)
- **Area:** Docs
- **Driver:** Public README accuracy
- **Type:** UX
- **Source:** C1 2026-10-24 2:36 PM; confirmed against `docs/screenshots/host.png` 2026-11-17
- **Date:** 2026-10-24
- **Notes:** Shot still shows a single **Strike / not on board (X)** button from before the Showdown X / Family play X split, and omits **Win at** / **Lightning round**. Keep existing screenshot files until a new capture is taken. Do not generate a fake UI shot.

## Next

### FEAT-01 — Generic public default pack

- **Horizon:** Next
- **Area:** Packs
- **Driver:** Public / Shelf sample
- **Type:** Feature
- **Source:** C1 2026-10-24 (flag); D15 kept the October pack; D19 says it stays for now
- **Date:** 2026-10-24
- **Notes:** Add a generic, non-internal sample pack and point `config.json` at it. Keep `packs/october-qad.json` as an example.

### TD-02 — Minutes-safe pytest CI

- **Horizon:** Next
- **Area:** CI
- **Driver:** Testability + CI minutes budget
- **Type:** Tech debt
- **Source:** No `.github/workflows` on `main`; cloud-prep review D20
- **Date:** 2026-11-17
- **Notes:** Do **not** add a workflow in the docs-only PR. Suggested workflow (estimate **~1 billed minute** per run; GitHub rounds up):

  - `on.pull_request` only (`opened`, `synchronize`, `reopened`, `ready_for_review`); **no** duplicate `push` build
  - `paths` (or ignore) so the job runs only when importer/Python/test files change (`feudpack/**`, `tests/**`, `requirements.txt`), not on docs-only PRs
  - `concurrency` grouped by workflow + PR, `cancel-in-progress: true`
  - skip drafts (`if: github.event.pull_request.draft == false`)
  - `actions/setup-python` with **pip cache**
  - `timeout-minutes` on the job (small, e.g. 5)
  - `python -m pytest -q`

### FEAT-02 — Light pack-authoring UX

- **Horizon:** Next
- **Area:** Packs
- **Driver:** Hosts editing JSON after `.review.md`
- **Type:** Feature
- **Source:** P-productize / pack-spec
- **Date:** 2026-10-22
- **Notes:** Small pack editor or in-browser review of cluster labels. Today: edit JSON by hand.

### TD-03 — Introduce product versioning

- **Horizon:** Next
- **Area:** Docs / release
- **Driver:** Team non-negotiables (automatic versioning)
- **Type:** Tech debt
- **Source:** Cloud-prep review D22
- **Date:** 2026-11-17
- **Notes:** Repo had no version. **0.1.0** is assigned to `01e97c8`. Decide tags vs a VERSION file vs changelog-only; do not pretend CI stamps a build number until there is a build.

## Later

### FEAT-03 — Hosted demo

- **Horizon:** Later
- **Area:** Platform
- **Driver:** Shelf demo link
- **Type:** Feature
- **Source:** Harvest §6; P-productize out of scope (no server)
- **Date:** 2026-11-17
- **Notes:** e.g. GitHub Pages. Product today is local-only.

### FEAT-04 — Buzz-in or clicker integration

- **Horizon:** Later
- **Area:** Gameplay
- **Driver:** Face-off UX
- **Type:** Feature
- **Source:** P-remote, P-productize (explicitly out of scope)
- **Date:** 2026-10-14
- **Notes:** App does not detect buzz-ins. Physical buzzers remain the design.

### FEAT-05 — Multi-device / mobile host

- **Horizon:** Later
- **Area:** Platform
- **Driver:** Architecture (one origin / one PC today)
- **Type:** Feature
- **Source:** Architecture; harvest
- **Date:** 2026-11-17
- **Notes:** Sync assumes same-origin windows on one machine.

## Parked

### FEAT-06 — Official Family Feud assets

- **Horizon:** Parked
- **Area:** Branding
- **Driver:** Copyright
- **Type:** Feature
- **Source:** D05
- **Date:** 2026-10-14
- **Notes:** Do not do this. Synthesized CC0-style ding/X only.

## Proposed

_(empty)_

## Bugs

_(none open.)_ When adding a bug: **Severity** Critical / High / Medium / Low, plus Area, Driver, Type=Bug, source, and date.
