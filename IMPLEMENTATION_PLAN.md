# Implementation Plan — Slice 17: Prove payment safety

## Metadata

- Status: **AWAITING APPROVAL**
- Plan ID: `slice-17-payment-safety-2026-11-06`
- NorthStar: campus service night (pay once → one paid Chef order → safe fulfillment → no payment ambiguity)
- Depends on: Slice 16 **SHIPPED** — PR [#33](https://github.com/loganware05/TrapHouseKitchen/pull/33) merged (`a3733be` on `main`)
- Issue: `local/slice-17-payment-safety` (placeholder until GitHub issue created after approval)
- Base: `origin/main` at `a3733be`
- Proposed branch: `fix/local-payment-safety-matrix`
- Rollback checkpoint: to be tagged `checkpoint/payment-safety-2026-11-06` after approval
- Created: 2026-11-06
- Last updated: 2026-11-06

## Prior delivery (closed)

| Slice | Scope | Status |
|-------|--------|--------|
| 15 | PWA web push | **Shipped** — PR #31 |
| 16 | Close release gaps + payment finalization replay fix | **Shipped** — PR #33 |

## NorthStar context

Slice 16 stopped late webhooks from reversing PREPARING+. Slice 17 must **prove** the payment path under success, decline, retry, refund, delayed/duplicate webhooks, and client/webhook races so a campus service night has no duplicate charges, double coupon consume, or ambiguous paid state.

## Current behavior (verified on `main`)

- `finalizeSuccessfulPayment` marks payment SUCCEEDED, creates CHARGE once if missing, sets order `paymentStatus: PAID`, only calls `setOrderStatus(PENDING)` when already PENDING, finalizes coupon, emails once when newly paid.
- Webhooks: `payment_intent.succeeded` / `payment_failed` / `canceled` / `charge.refunded`.
- Client/chef reconcile: `syncOrderPaymentFromStripe` + recent pending reconcile helpers.
- Refund API + `charge.refunded` handler update payment/order; **TODO** remains for customer refund confirmation email.
- Happy-path + basic idempotent charge-row coverage exists; concurrent webhook+client races and refund matrix are not fully proven.
- Money fields remain Prisma `Float` (known risk from Oct 22 review — optional in this slice unless Captain expands scope).

## Desired behavior

1. Success path remains idempotent under duplicate webhooks and concurrent client sync.
2. Decline / `payment_failed` leaves cart recoverable semantics unchanged; no false PAID.
3. Retry after decline can succeed without duplicate CHARGE or double coupon consume.
4. Late success after fulfillment advance still marks PAID and never reverses status (regression lock from Slice 16).
5. Full and partial refunds update payment/order correctly; duplicate `charge.refunded` deliveries are safe.
6. Concurrent finalize (webhook + `syncOrderPaymentFromStripe`) cannot create two CHARGE rows or consume a coupon twice.
7. Evidence recorded under `.agent/evidence/slice-17-payment-safety-*/` with unit/integration (+ sandbox Playwright payment lane when keys available).

## Non-goals

- Float → integer minor-units money migration (propose as follow-up unless Captain includes it)
- Staging environment rebuild (Slice 18)
- Making Playwright blocking in CI (Slice 19)
- Capacitor / SMS / Resend production reset email
- Changing live Stripe keys or production data without explicit Captain ops approval
- Operating hours / sellout

## Workstreams

| ID | Stream | Surfaces | Notes |
|----|--------|----------|-------|
| A | Race-safe finalization | `paymentFinalization.service.ts`, possibly `$transaction` / unique constraints on CHARGE | Atomic “mark paid + charge once + coupon once” |
| B | Refund correctness | `webhook.routes.ts` `handleChargeRefunded`, refund route | Idempotent refund rows; clarify partial vs full order status |
| C | Regression tests | `webhook-stripe.test.ts`, new unit/integration for races | Simulated concurrent finalize; decline→retry; refund duplicate |
| D | Sandbox evidence | `e2e/payment-flow.spec.ts` when `PLAYWRIGHT_PAYMENT_TESTS=1` | Success / decline / retry if practical |
| E | Docs | PROGRESS, TESTING, CHANGELOG, STATUS | Record matrix + remaining Float risk |

### Open questions (Captain)

1. Include **money Float → integer cents** migration in Slice 17, or defer?
2. Implement **refund confirmation email** now (closes webhook TODO), or leave TODO and only harden state?
3. Is **Stripe test-mode** sandbox evidence required in this PR, or backend integration matrix sufficient for merge with sandbox as follow-up smoke?

### Assumptions

- Default answers if Captain only says “approve”: defer Float migration; skip refund email (state-only); require integration tests; sandbox Playwright when secrets available but not a merge blocker if CI lacks live Stripe secrets.
- Production Chef seed-password rotation remains **ops-owned** and outside this code slice (still required for NorthStar trust).

## Validation

- Unit/integration: duplicate webhook, concurrent client+webhook, decline→retry, PREPARING+ late success, full/partial/duplicate refund
- Security review on payment/webhook paths; evidence under `.agent/evidence/security/`
- Production builds; no secrets committed
- Rollback: revert merge / redeploy prior Render deploy; checkpoint tag before branch work

## Autonomy budget

- Max implementation iterations after approval: 3
- Stop if race fix requires schema unique-index that cannot migrate safely without Captain DB approval

## Approval Record

- **Status:** AWAITING APPROVAL
- **Approved by:** —
- **Approval date:** —
- **Captain notes:** —

### Requested decision checklist

- [ ] Approve Slice 17 scope (race-safe finalize + refund idempotency + regression matrix)
- [ ] Float money migration: include / defer
- [ ] Refund customer email: implement / defer
- [ ] Sandbox Playwright: required for merge / optional follow-up

Implementation of product files will not begin until this plan is explicitly approved.
