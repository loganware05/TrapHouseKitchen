# Implementation Plan — Slice 12: Pre-launch Stripe regression, password reset, payment hardening

## Metadata

- Status: **AWAITING APPROVAL**
- Plan ID: `slice-12-prelaunch-payments-auth-2026-09-01`
- Parent plan: Slice 11 complete (`c0db11e` on `main`)
- Supersedes: `slice-12-coupon-email-delivery-2026-09-01` (coupon email → waiting list)
- Issue: `local/prelaunch-payments-auth` (placeholder until GitHub issue created)
- Base: `origin/main` at `c0db11e`
- Branch (on approval): `feature/local-prelaunch-payments-auth`
- Rollback checkpoint (on approval): `checkpoint/prelaunch-payments-auth-2026-09-01`
- Created: 2026-09-01
- Last updated: 2026-09-01

## Request (Captain)

Reprioritize from coupon-email Slice 12. Ship three workstreams in one coordinated slice:

1. **Pre-launch Stripe regression** — verify checkout, coupons, webhooks, and key alignment after Slices 10–11
2. **Password reset** — land `feat/password-reset` onto current `main`
3. **Payment hardening** — port remaining value from `feat/payment-webhook-hardening` (do not regress `paymentFinalization.service.ts`)

## Current behavior

| Area | Today (`main`) |
|------|----------------|
| Password reset | Prisma fields + migration + email template exist; **no** API routes or UI |
| `feat/password-reset` | Full flow (+505 lines); **75 commits behind** `main`; `App.tsx` conflict expected |
| Webhooks | `webhook.routes.ts` → `finalizeSuccessfulPayment` / `finalizeFailedPayment` |
| Coupon at PI create | `resolveCouponForPaymentIntent` — no mismatch guard if code ≠ `appliedCouponId` |
| `feat/payment-webhook-hardening` | Inline webhook logic (stale); **unique value:** mismatch guard + dedicated webhook/payment tests |
| Stripe keys | Frontend loads pk from `GET /api/payment/config`; Render smoke green 2026-09-01 |
| E2E payment | `e2e/payment-flow.spec.ts` — 3/3 with sandbox keys (documented in TESTING.md) |
| E2E auth reset | `e2e/auth-flow.spec.ts` expects `e2e-read-reset-token.ts` — script only on feature branch |
| QA | `QA_CHECKLIST.md` includes forgot/reset (1.6) — not testable on `main` until reset lands |

## Desired behavior

### A — Password reset (land feature branch)

1. `POST /api/auth/forgot-password` — generic success response; issues 1h token; emails via Resend when configured
2. `POST /api/auth/reset-password` — validates token; bcrypt hash; clears token fields
3. Frontend: `/forgot-password`, `/reset-password?token=…`, link from `/login`
4. Rebase `feat/password-reset` onto `main`; resolve `App.tsx` against current routes (no `/reviews/my` page, hydration `ProtectedRoute`, etc.)
5. Integration tests from branch + `e2e/auth-flow.spec.ts` green

**Documented debt (non-blocking this slice):** plaintext reset tokens in DB; token in URL query string — follow-up hardening slice.

### B — Payment hardening (cherry-pick onto `main` architecture)

**Do not** merge `webhook.routes.ts` from feature branch wholesale.

| Port to `main` | Action |
|----------------|--------|
| Coupon code mismatch | If `couponCode` and `order.appliedCouponId` both set and disagree → **400** |
| Webhook idempotency tests | Add/adapt `webhook-stripe.test.ts` against `paymentFinalization.service` |
| Payment service tests | Add `payment.service.test.ts` (amount math, guards, coupon paths) |
| Checkout mismatch test | Extend `coupon-gateways.test.ts` or `checkout-flow.test.ts` for mismatch case |
| Duplicate webhook / email guard | Assert via tests on **existing** `finalizeSuccessfulPayment` (`!wasPaid`) |

**Keep `main` semantics** unless Captain overrides:

| Topic | Decision |
|-------|----------|
| `payment_intent.canceled` | Order → **CANCELLED** (not `paymentStatus: FAILED`) |
| Charge idempotency | Keep `findFirst` before `create` in finalization service |

### C — Pre-launch Stripe regression (validation gate)

Automated + documented evidence before declaring slice complete:

| Layer | Command / check |
|-------|-----------------|
| Backend | `cd backend && npm run test:all` |
| Frontend build | `npm run build --prefix frontend` |
| Payment E2E | `PLAYWRIGHT_PAYMENT_TESTS=1` → `e2e/payment-flow.spec.ts` |
| Coupon E2E | `e2e/coupon-flow.spec.ts` (after `npm run e2e:seed` if required) |
| Auth E2E | `e2e/auth-flow.spec.ts` (after password reset) |
| Key alignment | `GET /api/payment/config` on Render — pk mode matches API `STRIPE_SECRET_KEY` mode |
| Production smoke | `/health`, `/api/categories`, web bundle (extend `.agent/evidence/render-smoke-20260901/`) |
| Manual QA | `QA_CHECKLIST.md` §1.6, §1.13–1.17, §4.x (Stripe trust) — record pass/fail in evidence |

**Stripe mode for regression:** automated tests use **test** keys; production smoke verifies config endpoint only (no live charge unless Captain explicitly runs manual live card test).

## Non-goals

- Coupon email delivery (returned to waiting list)
- SMS / push notifications
- Password-reset token hashing (document debt; separate slice)
- Capacitor iOS, delivery modeling, full Playwright suite stabilization
- Replacing `paymentFinalization.service.ts` with branch inline webhook code

## Assumptions

| # | Assumption | If wrong |
|---|------------|----------|
| 1 | `RESEND_API_KEY` + `FRONTEND_URL` set on Render for reset emails | Ops configures before manual QA 1.6 |
| 2 | Plaintext reset tokens acceptable for soft-launch | Scope expands to hash-at-rest |
| 3 | One feature PR for A+B, regression evidence in same PR | Captain wants split PRs |
| 4 | Test Stripe keys available locally for E2E | Blocker for payment E2E — document |
| 5 | `STRIPE_WEBHOOK_SECRET` configured in prod for webhook tests (manual/staging) | Webhook tests run in integration with mock secret |

## Delivery phases (single PR recommended)

### Phase 12A — Password reset

| Task | Files |
|------|-------|
| Rebase `feat/password-reset` onto `main` | `auth.routes.ts`, `auth.service.ts`, pages, `App.tsx`, script |
| Fix `App.tsx` routes | imports + `/forgot-password`, `/reset-password` |
| Verify migration already applied | `20260326203200_add_password_reset_fields` |

### Phase 12B — Payment hardening

| Task | Files |
|------|-------|
| Coupon mismatch guard | `payment.service.ts` |
| Webhook + payment tests (adapted) | `tests/integration/webhook-stripe.test.ts`, `tests/unit/payment.service.test.ts` |
| Mismatch integration case | `coupon-gateways.test.ts` or new `checkout-flow.test.ts` |

### Phase 12C — Regression + docs

| Task | Files |
|------|-------|
| Run full validation matrix | evidence dir |
| Update `TESTING.md`, `CHANGELOG.md`, `PROGRESS.md` | docs |
| Optional ADR | `DECISIONS.md` — coupon mismatch at PI create |
| QA checklist results | `.agent/evidence/prelaunch-stripe-20260901/validation.md` |

## Validation evidence

Store under `.agent/evidence/prelaunch-stripe-20260901/`:

- `validation.md` — test commands + results
- `qa-checklist.md` — manual Stripe/auth rows
- `render-payment-config.json` — redacted `/api/payment/config` snapshot (mode only, no secrets)

## Rollback

1. Revert to tag `checkpoint/prelaunch-payments-auth-2026-09-01`
2. Password reset: routes/UI removable without schema rollback (columns nullable)
3. Payment hardening: revert `payment.service.ts` mismatch guard + tests only

## Autonomy budget

- Max **2** rebase/merge iterations on `App.tsx` / `payment.service.ts`
- Max **2** iterations on payment/auth E2E flakes
- Max **1** iteration on webhook test adaptation to finalization service

## Documentation updates (on completion)

- `PROGRESS.md`, `CHANGELOG.md`, `TESTING.md`, `STATUS.md`
- `docs/features/authentication.md` — reset flow live
- `DECISIONS.md` — optional ADR for coupon mismatch enforcement

## Waiting list (deferred)

- Coupon email delivery (`slice-12-coupon-email-delivery`)
- Password-reset token hashing
- Message-system SMS / in-app inbox

## Approval Record

- **Status:** AWAITING APPROVAL
- **Presented to:** Captain (Logan)
- **Date:** 2026-09-01

### Captain decisions needed

1. **Approve this slice** as described (reset + hardening + regression in one PR)?
2. **Password reset tokens:** land with documented plaintext debt, or require hashing in this slice?
3. **`payment_intent.canceled`:** keep `CANCELLED` order status on `main` (recommended)?
