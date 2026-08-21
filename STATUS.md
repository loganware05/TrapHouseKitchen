# Project status

**Last updated:** 2026-08-21
**Production / shared baseline:** `88d6523` (`origin/main` — PR #22 pull-to-refresh)
**Canonical rule:** This file is the only place that asserts Shipped / WIP / Broken. Do not add new root `*_COMPLETE.md` / `*_READY.md` snapshots — update this file instead.

**Related:** [QA_CHECKLIST.md](QA_CHECKLIST.md) · [SUPPORT_PLAYBOOKS.md](SUPPORT_PLAYBOOKS.md) · [docs/deployment/render.md](docs/deployment/render.md) · [docs/deployment/go-live.md](docs/deployment/go-live.md) · [AGENTS.md](AGENTS.md)

**Current WIP:** Slice 8 receipt reviews on `feature/local-review-receipts` (validated; PR pending).

---

## Status recheck (2026-08-04)

| Check | Result |
|-------|--------|
| API `/health` | **200**, database connected |
| API dishes | **200** (2 dishes) |
| Web | **200** |
| Stripe | **Broken config** — API publishable **test**; web bundle baked **live** → client_secret account mismatch |
| Fix in flight | `fix/local-stripe-publishable-from-api` — load pk from `/api/payment/config` |

Evidence: `.agent/evidence/fix-stripe-pk-mismatch-20260804/`

---

## Shipped (web core)

On `origin/main` and considered the live product surface:

| Area | Notes |
|------|--------|
| Menu / cart / guest checkout | Soft-delete dishes; guest cart |
| Chef order pipeline | Pending → Preparing → Ready → Completed |
| Stripe payments | PaymentIntent + `automatic_payment_methods` |
| Per-dish reviews (receipt UX) | Chef approve/reject; **no** auto $4 coupon (deferred) |
| Allergens / dietary filters | Customer profile warnings |
| Dish requests + voting | Customer + chef management |
| Auth (customer / chef login) | JWT RBAC |
| PWA | Home-screen install |
| Docker (local dev only) | Files under [`docker/`](docker/) with root symlinks; see [`docker/README.md`](docker/README.md) |
| Render production deploy | `render.yaml` blueprint; the only production target |

---

## Ready to merge (code complete, review pending)

Local mega-commit `eb66711` was **not** pushed. Work was split onto these branches (open as PRs; prefer merge order below):

| Order | Slice | Branch | PR |
|------:|-------|--------|----|
| 1 | Docker docs (layout clarified) | `fix/docker-packaging` | [#1](https://github.com/loganware05/TrapHouseKitchen/pull/1) |
| 2 | Project status + doc archive | `chore/project-status` | [#2](https://github.com/loganware05/TrapHouseKitchen/pull/2) |
| 3 | Prisma migrations baseline | `chore/prisma-migrations-baseline` | [#3](https://github.com/loganware05/TrapHouseKitchen/pull/3) |
| 4 | Password reset | `feat/password-reset` (base: migrations) | [#4](https://github.com/loganware05/TrapHouseKitchen/pull/4) |
| 5 | Payment / webhook hardening | `feat/payment-webhook-hardening` (base: migrations) | [#5](https://github.com/loganware05/TrapHouseKitchen/pull/5) |
| 6 | AI order attribution | `feat/ai-order-attribution` (base: migrations) | [#6](https://github.com/loganware05/TrapHouseKitchen/pull/6) |
| 7 | Capacitor iOS scaffold | `feat/capacitor-ios-scaffold` (base: migrations) | [#7](https://github.com/loganware05/TrapHouseKitchen/pull/7) |
| 8 | Test harness + CI | `chore/test-harness-ci` (base: migrations) | [#8](https://github.com/loganware05/TrapHouseKitchen/pull/8) |

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
| Mega-commit Docker deletion | **Avoided** — `main` reset to `origin/main` restored `docker/*`. Docker is now local-dev-only. |
| AWS ECR / ECS pipeline | **Removed (2026-07-17)** — Render is the sole production deploy target. CI workflow keeps tests + Playwright E2E only. Historical AWS docs: [docs/archive/snapshots/aws.md](docs/archive/snapshots/aws.md). |

---

## WIP / overstated

| Item | Truth |
|------|--------|
| Capacitor / native iOS | Scaffold on `feat/capacitor-ios-scaffold`. `frontend/ios/` is generated locally / gitignored — **not** App Store ready. |
| Operating hours | Still deferred (not built). |
| Webhook email TODOs | Failed-payment / refund customer emails still open in payment slice. |
| Playwright E2E suite | CI job now boots both servers and runs, but **14 of 19 specs fail** against the real app (login redirects, checkout selectors). Job is `continue-on-error` until stabilized — do not treat a green PR as E2E-verified. |

---

## How to work from here

1. Keep `main` matching `origin/main` until a focused PR merges.
2. After each merge, move the slice from **Ready to merge** → **Shipped** (or **Ops gap**) here.
3. Historical one-off status write-ups live in [docs/archive/snapshots/](docs/archive/snapshots/).
