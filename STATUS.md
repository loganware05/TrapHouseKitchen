# Project status

**Last updated:** 2026-11-13
**Production / shared baseline:** `c65d186` (`origin/main` — Slice 18 staging Blueprint merged via PR #39)
**Canonical rule:** This file is the only place that asserts Shipped / WIP / Broken. Do not add new root `*_COMPLETE.md` / `*_READY.md` snapshots — update this file instead.

**Related:** [QA_CHECKLIST.md](QA_CHECKLIST.md) · [SUPPORT_PLAYBOOKS.md](SUPPORT_PLAYBOOKS.md) · [docs/deployment/render.md](docs/deployment/render.md) · [docs/deployment/staging.md](docs/deployment/staging.md) · [docs/deployment/go-live.md](docs/deployment/go-live.md) · [AGENTS.md](AGENTS.md)

**Current WIP:** Slice 18 staging **ops smoke** — Blueprint live; browser/payment smoke blocked on env wiring (see `.agent/evidence/slice-18-staging-smoke-20261113/`).

**Ship notes:** Staging API `/health` + web HTTPS **PASS**. Full customer→Chef smoke **not** operationally verified yet. Merged ≠ production success.

**Ops (staging):** Set `FRONTEND_URL` to staging web; set static `VITE_API_URL` to staging API and redeploy static; seed menu/Chef. Then re-run smoke.

---
