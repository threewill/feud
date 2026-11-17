# ThreeWill Feud — features

Shipped capabilities of the current board (`main` at `01e97c8`, product version **0.1.0**). The repo had **no product version** until 2026-11-17; **0.1.0** is assigned retroactively to that 2026-10-24 state (D22). Introducing tags / a version file is TD-03.

Pack JSON is the runtime source of truth. `packs/schema.json` documents the shape; the browser does not run a schema validator.

## Gameplay

- Two-family main game: show question, showdown, family play, 3-strike steal, award; leftover reveals after award do not add points
- **Showdown X** vs **Family play X (n of 3)** — showdown does not increment the strike count
- 1x / 2x / 3x round multiplier (tile points stay at survey pie; multiplier resets on the next board)
- Random next from remaining live boards; backups opt-in; jump to a remaining id
- Restart game (confirm) keeps names, backup checks, sound, hop flags, and host win/lightning overrides
- End game overlay (including ties)
- Optional lightning / Fast Money when the pack has lightning questions and the host checkbox is on
- Running audience clock (starts on the first Show question); optional audience hop (400 ms)

## Packs and import

- Pack loader (`config.json` or `?pack=`)
- Documented pack contract (`packs/schema.json`, `docs/pack-spec.md`)
- Forms/CSV importer: clustering, unique-person collapse, Hamilton pie, gitignored cluster review markdown
- pytest for pie, unique-person collapse, and Forms headers
- Sample October pack shipped (lightning off by default; five lightning questions present so the host can toggle on)

## Host / audience shell

- Separate host (`index.html`) and audience (`board.html`) windows
- BroadcastChannel + `localStorage` (+ `postMessage` and audience storage poll)
- Per-pack storage keys so two shows do not collide
- Host-played synthesized ding/buzzer; mute on the host page
- Host overrides: **Win at** (blank = no auto-win) and **Lightning round**

## Packaging

- MIT license
- Gameplay README and host/audience screenshots (host shot is stale — UX-01)
- `AGENTS.md`, pack-spec, CC0-style sounds

## Changelog

| Version | Date (ET) | Change |
| --- | --- | --- |
| (pre-0.1.0) `ae00484` | 2026-10-22 | Checkpoint before leaving the pre-repo tree |
| (pre-0.1.0) `c44a14b` | 2026-10-22 | Pack-driven boards, importer, optional lightning |
| (pre-0.1.0) `dda0956` | 2026-10-22 | Host win/lightning controls; showdown X vs family strikes |
| (pre-0.1.0) `693c5ae` | 2026-10-24 | MIT license |
| **0.1.0** `01e97c8` | 2026-10-24 | Gameplay README and screenshots. **First assigned product version** (no git tag). |
| 0.1.0 docs | 2026-11-17 | Cloud-prep docs only (Shelf-Details, FEATURES, backlog/roadmap, standards copy, QA starter). No app change. |
