# Feud

Local two-window Family Feud–style board (host + audience). **Not** official Family Feud: CC0 ding/X stand-ins, no licensed branding.

Shows are **file-based packs**. Point `config.json` at a JSON pack, or open `?pack=packs/yours.json`.

## Run

```bash
npx serve .
```

Open the URL (usually http://localhost:3000) for the **host**. Allow pop-ups, then **Open audience board** — share *that* window in Teams. Each reveal/strike focuses the board so Edge redraws, then returns to the host (~0.4s). Uncheck those options if you do not want the hop.

Do not double-click the HTML (`file://` cannot fetch packs).

## Packs

- Sample: [`packs/october-qad.json`](packs/october-qad.json) (ThreeWill QAD 2026; win at 500, **End game** on, lightning **off**)
- Schema: [`packs/schema.json`](packs/schema.json)
- How to author / import: [`docs/pack-spec.md`](docs/pack-spec.md)

Pack defaults: `win.targetPoints`, `win.hostCanEnd`, `lightning.enabled`. On the host page you can change **Win at** (blank = no auto-win) and **Lightning round** for this show. Those stick through Restart.

Face-off misses use **Showdown X** (overlay only, not one of the three). After a family is playing, **Family play X (n of 3)** is the strike that counts.

## Import a Microsoft Forms survey

```bash
pip install -r requirements.txt
python -m feudpack import "ThreeWill Pulse.xlsx" -o packs/myshow.json --id myshow --title "Our Feud"
```

Then set `config.json` `"pack"` to that file (or use `?pack=`). Read the generated `.review.md` and tidy cluster labels.

```bash
python -m pytest -q
```

## Sounds

Synthesized CC0-style ding/buzzer in `sounds/` (not Family Feud rips). See `sounds/README.md`.
