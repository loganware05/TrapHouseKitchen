# Slice 10 — Coupon gateways validation

**Date:** 2026-08-26  
**Branch:** `feature/local-coupon-gateways`  
**Plan:** `slice-10-coupon-gateways-2026-08-26`

## Backend

- Focused: `coupon-gateways.test.ts` + `coupon-routes.test.ts` — 8/8 passed
- Full suite: **81/81 passed** (`npm run test:all`)
- Gateway: `REVIEW_APPROVE` default ON, amount chef-controlled ($1–$50, seed $4)
- Checkout: soft reservation + `appliedCouponId` / `couponCode` resolution; tip PI uses explicit tip
- Abandon cancel clears `appliedCouponId`

## Frontend

- `npm run build --prefix frontend` — pass
- Chef Reviews: gateway toggle + amount
- CheckoutSheet: chargedTotal from server; tip recreate with tip override

## Waiting list

- Message-system coupon delivery — not built
