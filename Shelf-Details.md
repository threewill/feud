# ThreeWill Feud

## Product Description

**ThreeWill Feud** is a local host-and-audience board for a Family Feud-style show. The facilitator runs the game from a private host page; the room sees a separate audience window that can be shared into Microsoft Teams or shown on a projector. Show data lives in a JSON pack on disk — any set of survey questions, not a single baked-in script.

The board is static HTML, CSS, and JavaScript. You serve the folder over HTTP, open the host page, and pop out the audience window. A Python importer can turn a Microsoft Forms (or CSV) export into a pack by clustering similar answers and scoring them as a 100-point pie. There is no cloud service, no login, and no official Family Feud branding or sounds; ding and buzz are synthesized stand-ins.

---

## A Value Proposition

Planning a survey-ranked team game usually means fighting a slide deck: hidden answers, strike overlays, a running total, and a steal are awkward in PowerPoint, and a custom cloud app is more than most facilitators need. ThreeWill Feud gives the host a private control surface and the audience a classic numbered board, fed by a pack they can build from their own survey. The result is a show they can rehearse and run from one laptop, in the room or over Teams, without a deployment.

---

## An Elevator Pitch

ThreeWill Feud is a local host-and-audience board for a Family Feud-style show: load any survey as a JSON pack (or import a Microsoft Forms export), run the game from a private host window, and share the audience board into Teams or onto a projector — strikes, steals, scoring, and an optional lightning round included, with no cloud deploy required.

---

## The Key Features

### Host and audience

- **Private host page** for reveals, showdown vs family-play strikes, steal, award, multipliers, undo, and restart
- **Audience board** with numbered hidden slots, family scores, round pie, running clock, and overlays (X, steal, winner)
- **Two windows stay in sync** (BroadcastChannel + localStorage) so only the audience window is shared
- **Audience hop** (optional) so the board repaints under Teams window-share in Edge

### Show packs

- **JSON pack** of title, team names, live and backup boards, win rules, and optional lightning
- **Host overrides** for win score and lightning on/off, without editing the pack
- **Per-pack storage** so two shows on the same machine do not collide
- **Schema and field guide** (`packs/schema.json`, `docs/pack-spec.md`)

### Import and scoring

- **Microsoft Forms / CSV importer** (`python -m feudpack import`) with clustering, unique-person collapse, and Hamilton pie
- **Review markdown** (gitignored) so the host can tidy labels in the JSON before air
- **Random next board** from the remaining live pool; backups stay out until checked in

### Lightning and how a show ends

- **Win at** a target score, or no auto-win; **End game** freezes a winner or tie from current scores
- **Optional lightning / Fast Money** when the pack has questions: host-timed, two players, steal if they miss the target

### Licensing and assets

- **MIT** license; not affiliated with Family Feud
- **CC0-style synthesized** ding and buzzer, not official sound rips
