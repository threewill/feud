# Feud

Static host + audience board. Show data is a JSON pack (`config.json` or `?pack=`).

- Do not ship official Family Feud logos or sounds.
- Pack `win` / `lightning` are defaults; host can override win score and lightning on/off in the UI. Showdown X must not increment the 3-strike count.
- Importer: `python -m feudpack import …` — cluster review markdown is expected; hosts edit JSON.
- Tests: `python -m pytest -q` (pie, unique-person collapse, Forms headers).
- Telemetry: none (static files). Exception vs ThreeWill “all solutions” Insights default.
