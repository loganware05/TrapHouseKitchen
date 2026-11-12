# Project status

**Last updated:** 2026-11-11
**Production / shared baseline:** `3ba1506` (`origin/main` — includes PR #37 Slice 17 XRV docs; payment code from PR #35 `a195175`)
**Canonical rule:** This file is the only place that asserts Shipped / WIP / Broken. Do not add new root `*_COMPLETE.md` / `*_READY.md` snapshots — update this file instead.

**Related:** [QA_CHECKLIST.md](QA_CHECKLIST.md) · [SUPPORT_PLAYBOOKS.md](SUPPORT_PLAYBOOKS.md) · [docs/deployment/render.md](docs/deployment/render.md) · [docs/deployment/staging.md](docs/deployment/staging.md) · [docs/deployment/go-live.md](docs/deployment/go-live.md) · [AGENTS.md](AGENTS.md)

**Current WIP:** Slice 18 — staging rebuild ([#38](https://github.com/loganware05/TrapHouseKitchen/issues/38)) on `chore/local-staging-rebuild` (`render.staging.yaml` + ops docs). Production `render.yaml` unchanged.

**Ship notes:** Slice 17 payment safety is **merged + CI-tested**. Staging not yet provisioned in Render (Captain creates Blueprint from `render.staging.yaml`). Merged ≠ production success.

**Ops:** Production Chef password rotation attested (2026-11-11). Still confirm Render production runs `a195175`+ migration; create staging Blueprint when ready.

---
