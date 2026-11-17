# Project status

**Last updated:** 2026-11-16
**Production / shared baseline:** `e4fb791` (`origin/main` — Slice 20 + closeout docs). **Production API smoke:** `GET /api/kitchen/status` **200** after Captain redeploy (2026-11-17). Staging API still returns **404** on that route (pre–Slice 20 build live).
**Canonical rule:** This file is the only place that asserts Shipped / WIP / Broken. Do not add new root `*_COMPLETE.md` / `*_READY.md` snapshots — update this file instead.

**Related:** [QA_CHECKLIST.md](QA_CHECKLIST.md) · [SUPPORT_PLAYBOOKS.md](SUPPORT_PLAYBOOKS.md) · [docs/deployment/render.md](docs/deployment/render.md) · [docs/deployment/staging.md](docs/deployment/staging.md) · [docs/deployment/go-live.md](docs/deployment/go-live.md) · [AGENTS.md](AGENTS.md)

**Current WIP:** None (staging Slice 20 deploy verification open).

**Ship notes:** Slice **20** on `main` via PR #47; closeout docs PR #48. Prod kitchen ops endpoint verified live. Evidence: `.agent/evidence/slice-20-render-redeploy-20261116/`. Slice 17 production deploy SHA attestation still open for XRV.

**Ops:** Staging `traphousekitchen-api-staging` needs a successful redeploy of `main` (≥ `f5222e4`) so `/api/kitchen/status` returns 200. Migration already in prod buildCommand path (`prisma migrate deploy`).

---
