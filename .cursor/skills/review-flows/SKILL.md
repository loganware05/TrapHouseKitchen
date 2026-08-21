---
name: review-flows
description: Customer receipt-style dish reviews and chef moderation without review coupons
---

# Review Flows

## Use this Skill when

Working on customer dish reviews, order receipts with leave-review CTAs, review form deep-links, or chef approve/reject moderation.

## Current product rules

- Reviews are **per dish per order** (`orderId` + `dishId`).
- Eligible: `COMPLETED` + `PAID`, within `REVIEW_WINDOW_DAYS` (default 30).
- Chef must approve before a review is public.
- **Do not** create $4 coupons on approve (deferred). Checkout coupon APIs may still exist for legacy codes.

## Customer UX

1. Completed paid orders render as **receipts** (`OrderReceipt`) on Orders history and Profile (last 5).
2. Per-line **Leave a review** → `/reviews/new?orderId=&dishId=` (both params required for preselect).
3. `ReviewFormPage` must honor **both** query params once eligible orders load.
4. After submit, receipt shows **Review pending** (not leave-review).

## Chef UX

- `/chef/reviews`: approve publishes; reject deletes. No coupon toast/copy.

## Key files

- `frontend/src/components/OrderReceipt.tsx`
- `frontend/src/lib/orderReceipt.ts`
- `frontend/src/pages/ReviewFormPage.tsx`
- `frontend/src/pages/OrdersPage.tsx`, `ProfilePage.tsx`
- `backend/src/controllers/review.controller.ts`

## Validation

- Backend: `review-flow.test.ts` (approve does not create coupons)
- E2E: `e2e/review-receipts.spec.ts` after `npm run e2e:seed`
- Helpers: `npx tsx frontend/src/lib/orderReceipt.selftest.ts`
