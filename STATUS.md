# Project status

**Last updated:** 2026-11-05
**Production / shared baseline:** `f7c4719` (`origin/main` — PR #31 Slice 15 PWA web push)
**Canonical rule:** This file is the only place that asserts Shipped / WIP / Broken. Do not add new root `*_COMPLETE.md` / `*_READY.md` snapshots — update this file instead.

**Related:** [QA_CHECKLIST.md](QA_CHECKLIST.md) · [SUPPORT_PLAYBOOKS.md](SUPPORT_PLAYBOOKS.md) · [docs/deployment/render.md](docs/deployment/render.md) · [docs/deployment/go-live.md](docs/deployment/go-live.md) · [AGENTS.md](AGENTS.md)

**Current WIP:** Slice 16 — close release gaps on `fix/32-release-gaps-hardening` ([#32](https://github.com/loganware05/TrapHouseKitchen/issues/32)).

**Ops alert:** Production Chef `chef@traphouse.com` (`chef-1`) still accepted the documented local seed password as of 2026-11-05 verification. Rotate immediately with `backend/scripts/set-user-password.ts` against production `DATABASE_URL` before treating launch as safe.

---
