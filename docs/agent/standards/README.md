# ThreeWill engineering standards (vendored copy)

**Do not edit this folder by hand.** Refresh it only with a copy-and-sync PR. This product uses a **copy**, not a git submodule.

| | |
| --- | --- |
| **Source repo** | [https://github.com/threewill/threewill-engineering-standards](https://github.com/threewill/threewill-engineering-standards) |
| **Branch copied** | `master` |
| **Commit SHA** | `5baefffbf49d3d9dae2ae996f2d2be6687f53439` |
| **Copy date** | 2026-11-17 (America/New_York) |

That SHA is current `master` as of the copy date. It **includes** the CI minutes budget standard (engineering-standards PR #2, merged 2026-11-17).

This product is static HTML/CSS/JS plus a Python importer. Only standards that apply to that stack are copied here. **Omitted** from this copy (present upstream, not relevant): SPFx UI/provisioning/demo-data rules and docs, ThreeWillFooter patterns, SPFx bootstrap tools, Dataverse / Ruddr / Work IQ MCP catalogs, managed-services canvas, Link memory bridge, Replicate image-handling.

This `README.md` is the only file written by the sync. Upstream’s README describes a **git submodule** at `.cursor/rules/`, which this repo does **not** use.

## How this product consumes the copy

- Cursor loads thin pointers from **`.cursor/rules/*.mdc`**, which point here.
- Product-only guidance lives in **`AGENTS.md`** and **`docs/agent/`** (outside this folder).
- Paths inside the vendored `*.mdc` files that say `.cursor/rules/…` mean **this folder** (`docs/agent/standards/…`).

## How to refresh (sync PR)

1. Take the desired `master` commit of `threewill-engineering-standards`.
2. Replace the vendored `*.mdc` and `docs/` files in this folder (keep this `README.md`).
3. Still copy **only** rules relevant to a static HTML/JS + Python repo. If a new always-apply rule on `master` applies here, add it and a `.cursor/rules/` pointer.
4. Update the SHA and copy date (America/New_York) in this file.
5. Open a PR that only refreshes the copy (plus pointer files if needed).
