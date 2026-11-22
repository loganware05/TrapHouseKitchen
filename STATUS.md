# Project status

**Last updated:** 2026-11-22
**Production / shared baseline:** `4d044a2` (`origin/main` — Slice 17 XRV attestation PR #51 + kitchenOps Tuesday test fix PR #53). **Prod + staging** `GET /api/kitchen/status` **200** after Captain Render redeploy on `f5222e4`.
**Canonical rule:** This file is the only place that asserts Shipped / WIP / Broken. Do not add new root `*_COMPLETE.md` / `*_READY.md` snapshots — update this file instead.

**Related:** [QA_CHECKLIST.md](QA_CHECKLIST.md) · [SUPPORT_PLAYBOOKS.md](SUPPORT_PLAYBOOKS.md) · [docs/deployment/render.md](docs/deployment/render.md) · [docs/deployment/staging.md](docs/deployment/staging.md) · [docs/deployment/go-live.md](docs/deployment/go-live.md) · [AGENTS.md](AGENTS.md)

**Current WIP:** None.

**Ship notes:** Slice **20** complete — kitchen pause / hours / cap + `remainingServings` sellout. Prod and staging kitchen status endpoints verified live. Evidence: `.agent/evidence/slice-20-render-redeploy-20261116/`. Slice 17 deploy **attested (inferred)** 2026-11-17 (`.agent/evidence/slice-17-xrv-attestation-20261117/`); Slice 17 is **not** yet "operationally verified" — live webhook-replay / refund checks not run. kitchenOps weekday unit test no longer fails on Tuesdays (#52 / #53).

**Ops:** Kitchen-ops migration deployed via Render build (`prisma migrate deploy`). No further Slice 20 deploy action required.

---
