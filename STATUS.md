# Project status

**Last updated:** 2026-07-14  
**Production / shared baseline:** `a48d739` (`origin/main` — “Ready for production deployment”)  
**Canonical rule:** This file is the only place that asserts Shipped / WIP / Broken. Do not add new root `*_COMPLETE.md` / `*_READY.md` snapshots — update this file instead.

**Related:** [QA_CHECKLIST.md](QA_CHECKLIST.md) (after test-harness PR) · [SUPPORT_PLAYBOOKS.md](SUPPORT_PLAYBOOKS.md) · [docs/deployment/render.md](docs/deployment/render.md) · [docs/deployment/go-live.md](docs/deployment/go-live.md)

---

## Shipped (web core)

On `origin/main` and considered the live product surface:

| Area | Notes |
|------|--------|
| Menu / cart / guest checkout | Soft-delete dishes; guest cart |
| Chef order pipeline | Pending → Preparing → Ready → Completed |
| Stripe payments | PaymentIntent + `automatic_payment_methods` |
| Per-dish reviews + $4 coupons | Chef approve/reject |
| Allergens / dietary filters | Customer profile warnings |
| Dish requests + voting | Customer + chef management |
| Auth (customer / chef login) | JWT RBAC |
| PWA | Home-screen install |
| Docker local / ECR packaging | Files under [`docker/`](docker/) with root symlinks; see [`docker/README.md`](docker/README.md) |

---

## Ready to merge (code complete, review pending)

Local mega-commit `eb66711` was **not** pushed. Work was split onto these branches (open as PRs; prefer merge order below):

| Order | Slice | Branch |
|------:|-------|--------|
| 1 | Docker docs (layout clarified) | `fix/docker-packaging` |
| 2 | Project status + doc archive | `chore/project-status` |
| 3 | Prisma migrations baseline | `chore/prisma-migrations-baseline` |
| 4 | Password reset | `feat/password-reset` (base: migrations) |
| 5 | Payment / webhook hardening | `feat/payment-webhook-hardening` (base: migrations) |
| 6 | AI order attribution | `feat/ai-order-attribution` (base: migrations) |
| 7 | Capacitor iOS scaffold | `feat/capacitor-ios-scaffold` (base: migrations) |
| 8 | Test harness + CI | `chore/test-harness-ci` (base: migrations) |

**Backup of the unpacked mega-commit:** `backup/mega-eb66711` / `wip/mega-unpack` (local branches; do not merge as-is).

**Known debt (password reset):** reset tokens stored plaintext in DB; hash at rest before treating as hardened.

---

## Ops gap (code may be ready; not signed off)

| Gap | Action |
|-----|--------|
| Manual QA | Fill QA checklist before calling launch done |
| Live Stripe / webhooks / Apple Pay domain | [docs/deployment/go-live.md](docs/deployment/go-live.md) |
| Password-reset email | Needs `RESEND_API_KEY` + correct `FRONTEND_URL` |
| Legal contact placeholders | Privacy / Terms |
| Prod migration adopt | DBs that used `db push` need [docs/deployment/MIGRATION_BASELINE.md](docs/deployment/MIGRATION_BASELINE.md) before `migrate deploy` |

**Do not deploy migrations or payment PRs to production without the migration baseline notes and a Stripe sandbox pass.**

---

## Broken / blocked

| Item | Status |
|------|--------|
| Mega-commit Docker deletion | **Avoided** — `main` reset to `origin/main` restored `docker/*`. Do not re-delete packaging without updating ECR. |

---

## WIP / overstated

| Item | Truth |
|------|--------|
| Capacitor / native iOS | Scaffold on `feat/capacitor-ios-scaffold`. `frontend/ios/` is generated locally / gitignored — **not** App Store ready. |
| Operating hours | Still deferred (not built). |
| Webhook email TODOs | Failed-payment / refund customer emails still open in payment slice. |

---

## How to work from here

1. Keep `main` matching `origin/main` until a focused PR merges.
2. After each merge, move the slice from **Ready to merge** → **Shipped** (or **Ops gap**) here.
3. Historical one-off status write-ups live in [docs/archive/snapshots/](docs/archive/snapshots/).
