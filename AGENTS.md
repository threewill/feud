# ThreeWill Feud — agent notes

Local **host + audience** board for a Family Feud–style show. Static HTML/CSS/JS at the repo root; show data is a JSON pack (`config.json` or `?pack=`). Python importer: `python -m feudpack import …`. **Not** official Family Feud.

Product copy: `Shelf-Details.md`. This repo is **public**. Do not put survey respondent data, emails, or internal-pack jokes/first names into new docs, plans, or PRs.

## Read first

1. `docs/agent/standards/` — vendored ThreeWill engineering standards (never edit by hand; see `docs/agent/standards/README.md` for SHA). Paths in those files that say `.cursor/rules/` mean this copy.
2. This file (`AGENTS.md`).
3. `docs/agent/context-harvest.md` — harvested context (D01–D22, pitfalls, open issues).
4. `docs/decisions/DECISION-LOG.md`.
5. `docs/plans/` — historical Cursor plans (some superseded; see `docs/plans/README.md`).
6. `README.md`, `docs/pack-spec.md`, `packs/schema.json`.
7. `docs/FEATURES.md`, `roadmap/BACKLOG.md`, `roadmap/ROADMAP.md`.
8. `docs/qa/REGRESSION-PLAYBOOK.md` before changing gameplay or the importer.

## Plan first

**Always plan first except bug fixes.** Features, enhancements, and refactors: written plan, then approval, then implementation (local Cursor Plan mode, or a `docs/plans/<topic>.md` PR for cloud agents). Bug fixes may go straight to a PR. Mike reviews and merges; do not merge.

## Pitfalls (do not regress)

- **Serve over HTTP, not `file://`.** `npx serve .` from the repo root. `fetch` of `config.json` / packs fails on `file://`.
- **BroadcastChannel + `localStorage` sync** (plus `postMessage` to the popped-out window and a short storage poll on the audience view). Host and audience must share the **same origin**. Storage/channel keys are `feud-{pack.id}-v1` and `feud-{pack.id}`.
- **Buzzers are physical.** The app does not detect buzz-ins. Host judges the face-off and clicks.
- **Sounds** (`sounds/ding.wav`, `sounds/buzzer.wav`) are CC0-style synthesized stand-ins, played on the **host** PC. Do not ship official Family Feud logos or sound rips.
- **Showdown X** must not increment the 3-strike count. **Family play X (n of 3)** does; steal opens at 3.
- Pack `win` / `lightning` are **defaults**. Host **Win at** and the lightning checkbox override them and stick through Restart.
- Importer writes a sibling `*.review.md` (gitignored). Hosts tidy **JSON** labels; the pack file is what the board plays.
- **`docs/screenshots/host.png` is stale** (single Strike button from before the Showdown X / Family play X split). Do not overwrite screenshot files unless asked (UX-01).
- There is **no npm build** and **no JS test suite**. Importer tests: `python -m pytest -q`.

## PRs, docs, and versioning

- Use `.github/PULL_REQUEST_TEMPLATE.md`. Every PR fills the same-PR checklist (features, architecture, regression) or a `No … impact: <reason>` line.
- Behavior change → update `docs/FEATURES.md` and the regression playbook / test cases. New decision → a `Dnn` row in the decision log.
- Product version **0.1.0** is assigned retroactively to `01e97c8` (2026-10-24). There is no tag or package version yet (TD-03). Do not invent a semver bump for docs-only work.
- **No GitHub Actions** in this repo yet (TD-02). Do not add workflows unless asked. Follow the CI minutes budget standard if you do.
- Batch commits; push once per review round.

## Exceptions (team non-negotiables)

| Must-have | Why this repo differs | Alternate |
| --- | --- | --- |
| Azure Application Insights | Static files, no server | Telemetry: none (documented here and in README) |
| JS unit tests | No framework; host/audience are DOM + `localStorage` | Manual cases in `docs/qa/`; pytest for `feudpack` |
| Automatic versioning on builds | No build, no CI | Retroactive 0.1.0; TD-03 |
| In-repo CI/CD | Local-only product; not a hosted enterprise app | TD-02 suggests a minutes-safe pytest workflow |
| AuthN on every endpoint | No server, no login | N/A — files on disk |
