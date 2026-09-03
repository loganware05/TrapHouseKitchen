# Implementation Plan — Slice 12: Pre-launch Stripe regression, password reset, payment hardening

## Metadata

- Status: **APPROVED — IN IMPLEMENTATION**
- Plan ID: `slice-12-prelaunch-payments-auth-2026-09-01`
- Parent plan: Slice 11 complete (`c0db11e` on `main`)
- Issue: `local/prelaunch-payments-auth` (placeholder until GitHub issue created)
- Base: `origin/main` at `c0db11e`
- Branch: `feature/local-prelaunch-payments-auth`
- Rollback checkpoint: `checkpoint/prelaunch-payments-auth-2026-09-01`
- Created: 2026-09-01
- Last updated: 2026-09-01

## Captain decisions (2026-09-01)

1. **Approved** — reset + hardening + regression in one PR
2. **Password reset tokens:** SHA-256 hash at rest; raw token only in email / E2E capture file
3. **`payment_intent.canceled`:** keep order status **CANCELLED** on `main` (not `paymentStatus: FAILED`)

## Delivery summary

| Phase | Scope | Status |
|-------|--------|--------|
| 12A | Password reset API + UI + hashed tokens | Done |
| 12B | Coupon mismatch guard + payment/webhook tests | Done |
| 12C | Regression matrix + evidence | In progress |

## Validation evidence

Store under `.agent/evidence/prelaunch-stripe-20260901/`:

- `validation.md` — automated test results
- `qa-checklist.md` — manual rows (pending Captain QA)

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-09-01
- **Captain notes:** Hash reset tokens in this slice; keep CANCELLED order status on canceled PaymentIntents; single PR for A+B+C
