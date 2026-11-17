## Summary

<!-- What changed and why. Docs-only? Say so. -->

## Same-PR checklist

Fill **each** line. Either check the box (you updated that surface in this PR) or replace the line with `No … impact: <reason>`.

- [ ] **Features:** `docs/FEATURES.md` updated for user-visible behavior
- [ ] **Architecture:** `AGENTS.md` / `docs/pack-spec.md` / `docs/decisions/DECISION-LOG.md` updated if loader, sync, packs, or importer contracts changed
- [ ] **Regression:** `docs/qa/REGRESSION-PLAYBOOK.md` / `docs/qa/test-cases/` updated or a run note added under `docs/qa/runs/`

Example when nothing in that bucket moved:

`No feature impact: docs and Cursor rules only.`  
`No architecture impact: no app.js / feudpack / schema change.`  
`No regression impact: no gameplay or importer change.`

## Test plan

<!-- pytest, which TC-nn cases, or n/a -->

## CI minutes

<!-- Required if this PR adds or changes a GitHub Actions workflow: estimate billed minutes per run. Otherwise: no workflow change. -->
