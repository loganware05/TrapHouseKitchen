# Slice 8 — Receipt-style dish reviews

**Date:** 2026-08-21  
**Branch:** `feature/local-review-receipts`  
**Checkpoint:** `checkpoint/review-receipts-20260821` (`88d6523`)  
**Issue:** `local/review-receipts`

## Scope delivered

- Receipt UI (`OrderReceipt`) on Orders history + Profile (last 5)
- Review form honors `orderId` + `dishId` query params
- Chef approve no longer creates $4 coupons; review copy updated
- Checkout coupon APIs left intact for a later slice

## Validation

| Check | Result |
|-------|--------|
| `npx tsx frontend/src/lib/orderReceipt.selftest.ts` | pass |
| `npx tsc --noEmit` (frontend) | pass |
| `vitest run tests/integration/review-flow.test.ts` | **14/14 pass** |
| `playwright e2e/review-receipts.spec.ts` (chromium, `PLAYWRIGHT_BASE_URL=http://localhost:5173`) | **2/2 pass** |

## Screenshots

- `orders-receipt-pending.png` — receipt after submit shows Review pending
- `profile-recent-receipts.png` — Profile recent receipts section

## Security / a11y notes

- No new endpoints; approve only flips `approved`
- Star rating controls gained `aria-label` / `aria-pressed`
- Receipt articles labeled for assistive tech

## E2E note

Use `localhost` (not `127.0.0.1`) for `PLAYWRIGHT_BASE_URL` when `VITE_API_URL` targets `localhost:3001`, or Chromium may fail API calls with `net::ERR_FAILED`.
