# Implementation Plan — Slice 12: Coupon delivery via email (message-system phase 1)

## Metadata

- Status: **AWAITING APPROVAL**
- Plan ID: `slice-12-coupon-email-delivery-2026-09-01`
- Parent plan: Slice 11 complete (`slice-11-customer-nav-reviews-ptr-2026-08-28`, PR #27)
- Issue: `local/coupon-email-delivery` (placeholder until GitHub issue created)
- Base: `origin/main` at `c0db11e` (PR #28 docs closeout)
- Branch (on approval): `feature/local-coupon-email-delivery`
- Rollback checkpoint (on approval): `checkpoint/coupon-email-delivery-2026-09-01`
- Created: 2026-09-01
- Last updated: 2026-09-01

## Request

Deliver review-award coupon codes through the **message system** — deferred from Slices 10–11. There is no in-app messaging product today; **phase 1** is transactional **email** via existing Resend integration when a coupon is minted on chef review approve.

## Current behavior

| Area | Today |
|------|--------|
| Coupon mint | `approveReviewWithOptionalCoupon` mints on `REVIEW_APPROVE` gateway when enabled |
| Customer visibility | Saved/used codes on **Orders** tab; chef copy notes “Messaging delivery … waiting list” |
| Email | Resend used for order confirmation, status updates, chef notifications, password-reset template exists |
| Coupon email | **None** — customer must open app to see code |
| Gateway model | Single `REVIEW_APPROVE` row (`enabled`, `discountAmount`) |
| Re-approve | Re-approve with existing `sourceReviewId` coupon does **not** mint duplicate; no email path |

## Desired behavior

### A — Email on new coupon mint

1. After successful mint in `approveReviewWithOptionalCoupon`, send **coupon award email** to `review.user.email` when present.
2. Email includes: customer name, coupon code, discount amount, one-time-use note, link to order (`FRONTEND_URL/orders`).
3. If `RESEND_API_KEY` missing or send fails: **log warning**, approve + mint still succeed (non-blocking).
4. If user has no email (guest): skip send; in-app Orders tab remains source of truth.

### B — Chef gateway: delivery toggle (optional phase 1B)

Add second gateway key `COUPON_EMAIL_DELIVER` (default **ON** when Resend configured):

| Gateway | Controls |
|---------|----------|
| `REVIEW_APPROVE` | Mint on approve (unchanged) |
| `COUPON_EMAIL_DELIVER` | Send email when mint succeeds |

Chef Reviews UI: second toggle under coupon gateway card (“Email code to customer”).

**If Captain prefers minimal scope:** skip 1B in first PR — always email on mint when Resend + email exist.

### C — Re-approve / duplicate mint

- **No email** on re-approve when existing coupon is reused (already has code).
- **No email** when gateway disabled (approve-only).

### D — Non-goals (this slice)

- SMS / push notifications
- In-app message inbox UI
- Email on coupon **use** at checkout (order receipt may already note discount — verify only)
- Changing coupon amount, checkout apply logic, or nav layout

## Assumptions

| # | Assumption | If wrong |
|---|------------|----------|
| 1 | “Message system” = **email first** (Resend) | Captain wants SMS or in-app inbox — scope expands |
| 2 | Email is best-effort; mint must not fail if Resend down | Captain wants hard fail on email error |
| 3 | Guests without email rely on Orders tab | Captain wants phone/SMS capture |
| 4 | `FROM_EMAIL` / `FRONTEND_URL` already correct on Render | Fix env in ops, not this slice |
| 5 | Single email per **new** mint only | Captain wants reminder emails |

## Design

### Send point

```ts
// couponGateway.service.ts — after transaction succeeds
if (coupon && user.email && shouldDeliverEmail()) {
  await sendCouponAwardEmail({ ... }).catch(log);
}
```

### Email template

New `sendCouponAwardEmail` in `emailService.ts` — match existing HTML style (TrapHouse branding).

### Gateway seed (if 1B)

```sql
INSERT INTO "CouponAwardGateway" (key, enabled, "discountAmount")
VALUES ('COUPON_EMAIL_DELIVER', true, 0) ON CONFLICT DO NOTHING;
```

`discountAmount` unused for delivery gateway; only `enabled` matters.

## Phases

| Phase | Scope |
|-------|--------|
| 12A | `sendCouponAwardEmail` + hook on mint; integration tests with mocked Resend |
| 12B | (Optional) `COUPON_EMAIL_DELIVER` gateway + chef toggle + tests |
| 12C | Docs, evidence, chef copy update (“waiting list” → “emailed when enabled”) |

**Recommended:** 12A + 12C in one PR; add 12B if Captain wants chef control over email.

## Validation

| Layer | Command / check |
|-------|-----------------|
| Unit | email template renders code + amount |
| Integration | approve review → mint → `sendCouponAwardEmail` called (mock); no email on re-approve |
| Integration | approve with no user email → no throw |
| Backend full | `cd backend && npm run test:all` |
| Frontend build | `npm run build --prefix frontend` (chef copy only if 12B) |
| Manual | Render/staging: approve review with Resend configured → customer receives email |
| Evidence | `.agent/evidence/coupon-email-delivery-YYYYMMDD/` |

## Rollback

1. Revert to checkpoint tag `checkpoint/coupon-email-delivery-2026-09-01`.
2. Email hook is additive; removing deploy restores in-app-only delivery.

## Autonomy budget

- Max **2** iterations on Resend mock / flaky email tests.
- Max **1** iteration on gateway UI if 12B included.

## Documentation updates (on completion)

- `CHANGELOG.md`, `PROGRESS.md`, `TESTING.md`
- `DECISIONS.md` — ADR-006: coupon email delivery (if gateway split approved)
- Chef Reviews copy; remove “waiting list” for email when shipped

## Alternative slices (if Captain reprioritizes)

| Slice | Rationale |
|-------|-----------|
| **Pre-launch regression pack** | `PROJECT_CONTEXT` priority #1 — Stripe live + webhook retest checklist |
| **Password reset** | Branch `feat/password-reset` ready to land |
| **Payment / webhook hardening** | Branch `feat/payment-webhook-hardening` |
| **Capacitor iOS** | App Store path |
| **E2E stabilization** | CI confidence |
| **Delivery modeling** | Product gap; larger scope |

**Recommendation:** Slice 12 (coupon email) is the explicit post–Slice 11 backlog item and is small/shippable. Run pre-launch regression in parallel or as Slice 12A ops checklist without code if Captain prefers.

## Approval Record

- **Status:** AWAITING APPROVAL
- **Presented to:** Captain (Logan)
- **Date:** 2026-09-01

### Captain decisions needed

1. **Approve Slice 12 (coupon email)** vs reprioritize to pre-launch regression / password reset / iOS?
2. **Chef email toggle** (`COUPON_EMAIL_DELIVER`) in v1, or always email when Resend + user email exist?
3. **Email failure:** non-blocking (recommended) vs fail approve?
