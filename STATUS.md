# Project status

**Last updated:** 2026-11-16
**Production / shared baseline:** `f5222e4` (`origin/main` — Slice 20 service ops via PR #47). **Merged ≠ production success** until Render deploy + migration are confirmed.
**Canonical rule:** This file is the only place that asserts Shipped / WIP / Broken. Do not add new root `*_COMPLETE.md` / `*_READY.md` snapshots — update this file instead.

**Related:** [QA_CHECKLIST.md](QA_CHECKLIST.md) · [SUPPORT_PLAYBOOKS.md](SUPPORT_PLAYBOOKS.md) · [docs/deployment/render.md](docs/deployment/render.md) · [docs/deployment/staging.md](docs/deployment/staging.md) · [docs/deployment/go-live.md](docs/deployment/go-live.md) · [AGENTS.md](AGENTS.md)

**Current WIP:** None.

**Ship notes:** Slice **20** complete on `main` — kitchen pause / Chicago weekly hours / concurrent cap + `remainingServings` sellout (assert at unpaid create + PaymentIntent create; finalize clamp under row lock). Evidence: `.agent/evidence/slice-20-service-ops-20261116/`. Slice 17 production deploy SHA attestation still open for XRV.

**Ops:** Apply migration `20261116200000_kitchen_ops_and_remaining_servings` on staging/production when/after deploy of Slice 20.

---
