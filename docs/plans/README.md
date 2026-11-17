# Historical Cursor plans

These files are **verbatim copies** of local Cursor plans from 2026-09-29 through 2026-10-22 (America/New_York). They are **historical**. Prefer current `app.js`, `packs/schema.json`, `docs/pack-spec.md`, `docs/agent/context-harvest.md`, and `docs/decisions/DECISION-LOG.md` when they disagree.

The copies include facilitator names and QAD runbook details from the original plans. Do not lift those into Shelf copy, README, or FEATURES.

| File | Topic | Status vs shipped code |
| --- | --- | --- |
| [qad_corporate_feud_5513b6fa.plan.md](qad_corporate_feud_5513b6fa.plan.md) | QAD Oct 15 runbook: two-family Feud, open-ended boards, ~60 minutes | **Shipped as a live show, then superseded as a product.** The runbook lived in another repo; this product is the reusable board. Todos in the plan are completed. |
| [qad_feud_boards_62cebdbf.plan.md](qad_feud_boards_62cebdbf.plan.md) | Cluster survey answers as a 100-point pie; first-to-500; drop Fast Money for that event | **Shipped for the event, then extended.** Pie + unique-person collapse remain. Win-at-500 is a **pack default** (`packs/october-qad.json`), not hardcoded. Lightning exists but is **off** by default in that pack. |
| [remote_feud_board_360720d9.plan.md](remote_feud_board_360720d9.plan.md) | Local two-window static board for Teams share; physical buzzers | **Shipped.** Host + audience windows, BroadcastChannel/`localStorage` sync, audience hop, synthesized sounds. Buzz-in is still **out of scope** (FEAT-04). |
| [productize_feud_repo_d66fe29b.plan.md](productize_feud_repo_d66fe29b.plan.md) | New `threewill/feud` repo, pack spec, Forms importer, optional lightning | **Shipped** on 2026-10-22 (`c44a14b`, then `dda0956`). Frontmatter still shows some todos as `in_progress`/`pending`; that is cosmetic. Host win/lightning overrides and Showdown X vs Family play X landed in `dda0956` after this plan. |

Do not treat planned `boards.js` or `tw-feud-state-v1` as current. Runtime storage is `feud-{pack.id}-v1`.
