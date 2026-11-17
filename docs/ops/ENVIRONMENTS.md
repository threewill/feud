# Environments

ThreeWill Feud is **local only**. There is no hosted environment, app registration, tenant install, or secret store.

## Local board

| | |
| --- | --- |
| What | Static HTML/CSS/JS at the repo root |
| How | `npx serve .` then open the printed URL (usually `http://localhost:3000`) for the host |
| Audience | **Open audience board** (separate window). Share that window into Teams or onto a projector |
| Pack | `config.json` → `pack`, or `?pack=packs/yours.json` |
| Node | Needed only for `npx serve`. No `npm install`, no build |
| Secrets | None |

Do not open `index.html` from disk (`file://` cannot `fetch` packs).

## Local importer

| | |
| --- | --- |
| What | `python -m feudpack import …` |
| How | `pip install -r requirements.txt` then the CLI in `docs/pack-spec.md` / README |
| Secrets | None. Survey `.xlsx` stays on disk; `*.review.md` is gitignored |

## Not in this repo

- No GitHub Actions (yet; TD-02).
- No Application Insights or other telemetry.
- No `.env` files.

If a leftover QAD snapshot exists in another repository, it is not a deploy target for this product.
