# Project status

**Last updated:** 2026-11-13
**Production / shared baseline:** `c65d186` (`origin/main` — Slice 18 staging Blueprint merged via PR #39)
**Canonical rule:** This file is the only place that asserts Shipped / WIP / Broken. Do not add new root `*_COMPLETE.md` / `*_READY.md` snapshots — update this file instead.

**Related:** [QA_CHECKLIST.md](QA_CHECKLIST.md) · [SUPPORT_PLAYBOOKS.md](SUPPORT_PLAYBOOKS.md) · [docs/deployment/render.md](docs/deployment/render.md) · [docs/deployment/staging.md](docs/deployment/staging.md) · [docs/deployment/go-live.md](docs/deployment/go-live.md) · [AGENTS.md](AGENTS.md)

**Current WIP:** Slice 18 staging ops — API smoke steps 5–10 **PASS**; browser path still blocked (CORS/`VITE_API_URL` still production). Evidence: `.agent/evidence/slice-18-staging-smoke-20261113/`.

**Ship notes:** Staging API customer→pay→Chef pipeline verified via API. Browser UI against staging hosts not yet verified. Merged ≠ production success.

**Ops (staging):** Re-apply `FRONTEND_URL` + `VITE_API_URL` on **staging** services (live responses still show production hosts) → Clear cache + redeploy static → browser re-smoke.

---
