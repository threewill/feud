# ThreeWill Feud (local board)

**Product home:** [github.com/threewill/feud](https://github.com/threewill/feud) — reusable show packs, win/lightning config, and the Forms importer. This folder is the October 2026 QAD snapshot; new shows should use that repo.

From the **ThreeWilly repo root**:

```bash
npx serve docs/qad/feud
```

Open the URL it prints (usually http://localhost:3000) for the **host** view. Allow pop-ups, then **Open audience board** — that is a **separate window** so Teams can Share window. Each reveal/strike focuses that window so Edge redraws, then returns to the host (~0.4s). Uncheck those options on the host page if you do not want the hop.

**End game** puts a winner (or tie) overlay on the audience board from the current scores and leaves it up until you **Restart game** or start another reveal/strike. A family that hits **500** on award also gets a sticky win banner.

Do not double-click the HTML unless `npx serve` is unavailable.
