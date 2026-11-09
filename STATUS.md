# Project status

**Last updated:** 2026-11-09
**Production / shared baseline:** `a195175` (`origin/main` — PR #35 Slice 17 payment safety matrix)
**Canonical rule:** This file is the only place that asserts Shipped / WIP / Broken. Do not add new root `*_COMPLETE.md` / `*_READY.md` snapshots — update this file instead.

**Related:** [QA_CHECKLIST.md](QA_CHECKLIST.md) · [SUPPORT_PLAYBOOKS.md](SUPPORT_PLAYBOOKS.md) · [docs/deployment/render.md](docs/deployment/render.md) · [docs/deployment/go-live.md](docs/deployment/go-live.md) · [AGENTS.md](AGENTS.md)

**Current WIP:** None in code. Slice 18 (staging rebuild) plan is **AWAITING APPROVAL** in `IMPLEMENTATION_PLAN.md`.

**Ops alert:** Rotate production Chef `chef@traphouse.com` off the seed password if not already done (see First Mate rotation steps / `backend/scripts/set-user-password.ts`).

---
