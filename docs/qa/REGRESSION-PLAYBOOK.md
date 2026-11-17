# Regression playbook

ThreeWill Feud has **no JavaScript test suite**. Importer logic is covered by pytest. Use this playbook before merging gameplay, pack-loader, or importer changes.

## When to run

| Change | Run |
| --- | --- |
| `app.js`, `index.html`, `board.html`, `styles.css` | Manual cases TC-01–TC-07 (host + audience) |
| `feudpack/`, `tests/`, `requirements.txt` | `python -m pytest -q` (TC-09) |
| Pack schema / pack-spec / sample pack | TC-01 plus a smoke of win/lightning if those fields moved |
| Docs only | No regression impact — say so on the PR |

Record a dated note under `docs/qa/runs/` when you actually execute a pass (copy the template in `docs/qa/runs/README.md`).

## How to run the board

```bash
npx serve .
```

Open the printed URL for the **host**. Allow pop-ups. **Open audience board** and keep both windows visible (or share only the audience window). Do not use `file://`.

Default pack: `packs/october-qad.json` via `config.json`. Optional: `?pack=packs/yours.json`.

## Cases

| ID | File | What it covers |
| --- | --- | --- |
| TC-01 | [test-cases/TC-01-pack-load.md](test-cases/TC-01-pack-load.md) | Pack load (`config.json` / `?pack=`) |
| TC-02 | [test-cases/TC-02-host-audience-sync.md](test-cases/TC-02-host-audience-sync.md) | Host and audience stay in sync |
| TC-03 | [test-cases/TC-03-strikes.md](test-cases/TC-03-strikes.md) | Family play strikes and steal-open at 3 |
| TC-04 | [test-cases/TC-04-showdown-vs-family-x.md](test-cases/TC-04-showdown-vs-family-x.md) | Showdown X vs Family play X |
| TC-05 | [test-cases/TC-05-steal-scoring.md](test-cases/TC-05-steal-scoring.md) | Steal, award, leftover reveals, multiplier |
| TC-06 | [test-cases/TC-06-win-score-override.md](test-cases/TC-06-win-score-override.md) | Host **Win at** override + Restart |
| TC-07 | [test-cases/TC-07-lightning-toggle.md](test-cases/TC-07-lightning-toggle.md) | Lightning checkbox vs pack default |
| TC-09 | [test-cases/TC-09-forms-importer-pytest.md](test-cases/TC-09-forms-importer-pytest.md) | Forms importer via pytest |

There is **no** automated browser case. Sounds: ding on reveal, buzz on X; mute on the host page.

## Pass / fail

A case fails if the audience window disagrees with the host, Showdown X increments the 3-strike count, leftovers add points after award, or pytest is red.
