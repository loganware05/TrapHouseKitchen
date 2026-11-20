# Project status

**Last updated:** 2026-11-17
**Production / shared baseline:** `674d2e1` (`origin/main` — Slice 20 + smoke docs). **Prod + staging** `GET /api/kitchen/status` **200** after Captain Render redeploy on `f5222e4` (re-probed 2026-11-17T04:47Z).
**Canonical rule:** This file is the only place that asserts Shipped / WIP / Broken. Do not add new root `*_COMPLETE.md` / `*_READY.md` snapshots — update this file instead.

**Related:** [QA_CHECKLIST.md](QA_CHECKLIST.md) · [SUPPORT_PLAYBOOKS.md](SUPPORT_PLAYBOOKS.md) · [docs/deployment/render.md](docs/deployment/render.md) · [docs/deployment/staging.md](docs/deployment/staging.md) · [docs/deployment/go-live.md](docs/deployment/go-live.md) · [AGENTS.md](AGENTS.md)

**Current WIP:** None.

**Ship notes:** Slice **20** complete — kitchen pause / hours / cap + `remainingServings` sellout. Prod and staging kitchen status endpoints verified live. Evidence: `.agent/evidence/slice-20-render-redeploy-20261116/`. Slice 17 deploy **attested (inferred)** 2026-11-17 from ancestry + live Slice 20 endpoints (`.agent/evidence/slice-17-xrv-attestation-20261117/`); Slice 17 is **not** yet "operationally verified" — live webhook-replay / refund checks not run.

**Ops:** Kitchen-ops migration deployed via Render build (`prisma migrate deploy`). No further Slice 20 deploy action required.

---
