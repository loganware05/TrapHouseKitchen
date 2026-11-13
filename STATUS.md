# Project status

**Last updated:** 2026-11-13
**Production / shared baseline:** `a81e205` (`origin/main` — Slice 18 staging smoke evidence merged via PR #40)
**Canonical rule:** This file is the only place that asserts Shipped / WIP / Broken. Do not add new root `*_COMPLETE.md` / `*_READY.md` snapshots — update this file instead.

**Related:** [QA_CHECKLIST.md](QA_CHECKLIST.md) · [SUPPORT_PLAYBOOKS.md](SUPPORT_PLAYBOOKS.md) · [docs/deployment/render.md](docs/deployment/render.md) · [docs/deployment/staging.md](docs/deployment/staging.md) · [docs/deployment/go-live.md](docs/deployment/go-live.md) · [AGENTS.md](AGENTS.md)

**Current WIP:** None.

**Ship notes:** Slice **18** complete — staging Blueprint (PR #39) + ops smoke (PR #40). Staging API steps 5–10 **PASS**; browser register→cart→Stripe Payment Element (test) **PASS**. Evidence: `.agent/evidence/slice-18-staging-smoke-20261113/`. Merged ≠ production success; production deploy SHA attestation for Slice 17 (`a195175`) still open for XRV.

**Ops:** Staging stack remains for non-prod verification. Optional Captain browser card confirm on staging. Next product slice: **19** (decisive CI / Playwright ≥1.61) — plan not yet approved.

---
