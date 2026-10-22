# Feud show pack spec

Runtime source of truth is a JSON file (see `packs/schema.json`). Serve the repo over HTTP (`npx serve`) and either set `config.json` → `pack` or open `?pack=packs/myshow.json`.

## Top-level

| Field | Meaning |
|---|---|
| `id` | Storage/channel namespace (`feud-{id}-v1`) so two shows do not collide |
| `title` | Host and audience branding |
| `families.a` / `families.b` | Default team names |
| `boards[]` | Face-off boards (`pool`: `live` or `backup`) |

Each board: `id`, `question`, `answers[{text, pts}]`, optional `source`.

## Win

| Field | Meaning |
|---|---|
| `targetPoints` | Auto-win score, or `null` for no auto-win |
| `hostCanEnd` | Show the **End game** button |
| `onTarget` | `banner` = sticky overlay, keep playing; `endAndMaybeLightning` = end the main game (then lightning if enabled) |

## Lightning (Fast Money)

| Field | Meaning |
|---|---|
| `enabled` | If false, none of the lightning UI is shown |
| `target` | Combined points needed (classic **200**) |
| `player1Seconds` / `player2Seconds` | 15 / 20 classic |
| `steal` | Other family gets one guess on a double-miss |
| `questions[]` | Five (typical) boards with answers + pts |

Host-operated: no buzz-in. Player 2 cannot reuse player 1’s answer index on the same question.

## Forms import

Microsoft Forms Excel: identity columns (`ID`, `Name`, `Email`, …) then paired prompts:

- `{question} — first answer`
- `{question} — second answer (optional)`

en-dash, em-dash, or hyphen are accepted.

```bash
pip install -r requirements.txt
python -m feudpack import path/to/Forms.xlsx -o packs/myshow.json --id myshow --title "Our Feud"
```

Clustering: normalize case/punctuation, RapidFuzz token-set merge (default threshold 85), **unique-person collapse** (one vote per person per cluster), Hamilton pie to 100. A sibling `myshow.review.md` lists raw strings — edit the JSON labels before air.

Flags: `--threshold`, `--pie 0` (keep raw votes), `--max-live`, `--live-ids Q-01-foo,Q-02-bar`, `--lightning-count 5 --lightning`, `--no-target`, `--no-end-button`.

CSV is also accepted if it uses the same header names.

## Pie / clustering notes

Hand-clustered labels (e.g. “Grant-style casual games”) will not match the importer 1:1. The pack JSON is what the board plays.
