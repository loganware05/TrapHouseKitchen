# Implementation Plan — Slice 10: Coupon checkout fix + chef award gateways

## Metadata

- Status: **APPROVED**
- Plan ID: `slice-10-coupon-gateways-2026-08-26`
- Parent plan: `post-launch-ux-batch-2026-08-15` (Slices 1–9 complete; Slice 9 ops closed)
- Issue: `local/coupon-gateways`
- Base: `origin/main` after Slice 9 ops docs (`13a7029`)
- Branch: `feature/local-coupon-gateways`
- Rollback checkpoint: `checkpoint/coupon-gateways-2026-08-26`
- Created: 2026-08-26
- Last updated: 2026-08-26

## Request

1. Make coupon discounts **reliably reduce** the amount charged at checkout (Stripe PaymentIntent + order totals).
2. Restore **review-approval → coupon** as the **default award gateway** (previous distribution method).
3. Give the **chef** the ability to **enable/disable** coupon award gateways and set the **coupon amount**.
4. Keep **message-system coupon delivery** on the waiting list (out of scope).
5. Apple Pay: **no work this slice**.

## Captain decisions (2026-08-26)

| Topic | Decision |
|-------|----------|
| Coupon apply-at-checkout | Fix this slice |
| Default award path | Previous method — mint on chef review approve |
| Chef control | Enable/disable gateways **and set discount amount** |
| Default amount | $4.00 (seed); chef may change |
| Message / SMS coupon send | Waiting list |
| Apple Pay | Skip unless regression |
| Delivery | 10A+10B one PR |

## Current behavior

| Area | Today |
|------|--------|
| Review approve | Approve only — no coupon mint (ADR-001) |
| Checkout UI | Validate via `POST /coupons/validate`; pass `couponCode` on `/orders/checkout` |
| Stripe amount | Discounted only if `couponCode` reaches PI create |
| Tip + PI | Tip handlers can recreate PI with stale tip state |
| Chef UI | No gateway toggles or amount control |

## Desired behavior

### A — Reliable checkout discount

1. Discount baked into PaymentIntent and order `appliedCouponId` / `finalAmount`.
2. UI totals track server charged amount.
3. Tip changes recreate PI with correct tip + coupon.
4. Soft-claim coupon when attached to unpaid order; finalize on pay; release on cancel/abandon.
5. Pay-path tests assert discounted cents.

### B — Award gateways

1. Gateway `REVIEW_APPROVE` (default **ON**, default amount **$4.00**):
   - When ON → mint coupon for `discountAmount` set by chef.
   - When OFF → approve only.
2. Chef UI: toggle + amount input.
3. Supersede ADR-001 → ADR-004.

### C — Waiting list

- Send coupon via messaging system — document only.

## Non-goals

- Messaging delivery, Apple Pay work, global public promo codes.

## Design

```
CouponAwardGateway {
  key             String  @id   // "REVIEW_APPROVE"
  enabled         Boolean @default(true)
  discountAmount  Float   @default(4.00)
  updatedAt       DateTime @updatedAt
  updatedBy       String?
}
```

Amount bounds: **$1.00–$50.00** (validation).

## Phases (single PR)

| Phase | Scope |
|-------|--------|
| 10A | Checkout reliability + tip/PI + tests |
| 10B | Gateway model + mint + chef toggle/amount UI |
| 10C | ADR/docs/evidence |

## Validation

- Unit + integration + E2E pay-path discount assertion
- Frontend build
- Evidence under `.agent/evidence/coupon-gateways-YYYYMMDD/`

## Rollback

- Checkpoint tag; disable gateway; revert API deploy.

## Autonomy budget

- Max 3 iterations on Stripe amount / tip race flakes.

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-08-26
- **Override:** Coupon **amount** is chef-controlled (default $4.00 seed)
- **Scope:** Phases 10A+10B+10C in one slice (`feature/local-coupon-gateways`)
