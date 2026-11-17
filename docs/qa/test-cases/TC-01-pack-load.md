# TC-01 — Pack load

**Area:** Packs  
**Type:** Manual

## Setup

`npx serve .` from the repo root.

## Steps

1. Open the host URL with no query string. Confirm the host title comes from the default pack (`config.json` → `packs/october-qad.json`, title ThreeWill Feud).
2. Open `?pack=packs/october-qad.json` explicitly. Same title; no fetch error.
3. Open a bogus `?pack=packs/does-not-exist.json`. Host shows “Could not load show pack” and mentions `npx serve`.
4. Confirm two shows would not collide: storage key is `feud-october-qad-v1` (DevTools → Application → localStorage) after a successful load.

## Expected

Default and `?pack=` load JSON over HTTP. `file://` is not a supported path (do not test as a pass condition; it should fail to fetch).
