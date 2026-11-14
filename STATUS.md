# Project status

**Last updated:** 2026-11-13
**Production / shared baseline:** `9ac0008` (`origin/main` — Slice 18 closeout via PR #41)
**Canonical rule:** This file is the only place that asserts Shipped / WIP / Broken. Do not add new root `*_COMPLETE.md` / `*_READY.md` snapshots — update this file instead.

**Related:** [QA_CHECKLIST.md](QA_CHECKLIST.md) · [SUPPORT_PLAYBOOKS.md](SUPPORT_PLAYBOOKS.md) · [docs/deployment/render.md](docs/deployment/render.md) · [docs/deployment/staging.md](docs/deployment/staging.md) · [docs/deployment/go-live.md](docs/deployment/go-live.md) · [AGENTS.md](AGENTS.md)

**Current WIP:** Slice 19 decisive CI — branch `chore/local-slice-19-decisive-ci` (#42).

**Ship notes:** Playwright **1.65.1**; tagged `@core` E2E suite is **blocking** in CI (`test:e2e:core`). Local core run **15 passed / 4 skipped**. Non-core specs remain in-repo but outside the gate. Merged ≠ production success; Slice 17 production deploy SHA attestation still open for XRV.

**Ops:** Merge Slice 19 PR when CI green. Staging stack unchanged.

---
