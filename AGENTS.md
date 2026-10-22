# Feud

Static host + audience board. Show data is a JSON pack (`config.json` or `?pack=`).

- Do not ship official Family Feud logos or sounds.
- Prefer pack-field changes (`win`, `lightning`) over hardcoding in `app.js`.
- Importer: `python -m feudpack import …` — cluster review markdown is expected; hosts edit JSON.
- Tests: `python -m pytest -q` (pie, unique-person collapse, Forms headers).
- Telemetry: none (static files). Exception vs ThreeWill “all solutions” Insights default.
