# Implementation Plan — Slice 17: Prove payment safety

## Metadata

- Status: **APPROVED — IMPLEMENTING**
- Plan ID: `slice-17-payment-safety-2026-11-06`
- NorthStar: campus service night (pay once → one paid Chef order → safe fulfillment → no payment ambiguity)
- Depends on: Slice 16 **SHIPPED** — PR [#33](https://github.com/loganware05/TrapHouseKitchen/pull/33) merged (`a3733be` on `main`)
- Issue: [#34](https://github.com/loganware05/TrapHouseKitchen/issues/34)
- Base: `origin/main` at `a3733be`
- Branch: `fix/local-payment-safety-matrix`
- Rollback checkpoint: `checkpoint/payment-safety-2026-11-06`
- Created: 2026-11-06
- Last updated: 2026-11-09

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-11-09
- **Captain notes:** Approve with plan defaults — defer Float→cents; defer refund email; integration matrix required; sandbox Playwright optional

## Scope (approved)

| Workstream | Status |
|------------|--------|
| A Race-safe finalization (locks + single CHARGE + coupon once) | Implementing |
| B Refund webhook idempotency (`finalizeChargeRefunded` + unique `stripeRefundId`) | Implementing |
| C Regression tests (concurrent finalize, late fail, refund dup, decline→retry) | Implementing |
| D Sandbox Playwright | Optional follow-up |
| E Docs / evidence | Pending |

## Non-goals (confirmed)

- Float → integer cents migration
- Refund confirmation email
- Staging / decisive CI / Capacitor

## Rollback

```bash
git checkout main
git reset --hard checkpoint/payment-safety-2026-11-06
# If merged: revert the Slice 17 PR and redeploy previous Render deploy
```
