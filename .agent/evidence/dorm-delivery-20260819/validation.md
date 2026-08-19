# Slice 4 validation — dorm delivery location

**Date:** 2026-08-19  
**Branch:** `feature/local-dorm-delivery`  
**Checkpoint:** `checkpoint/dorm-delivery-2026-08-19` (`a855ed8`)

## Changes

- Prisma: nullable `Order.deliveryLocation` + migration `20260819210000_add_order_delivery_location`
- Checkout: required dorm dropdown; room number for East/North/West/Marable
- Backend validation on `POST /api/orders/checkout`
- Customer Orders, order detail, and Chef orders show delivery location

## Tests

```
backend npm run test:all — 59/59 passed
backend/tests/integration/delivery-location.test.ts — 4/4 passed
frontend npx tsc --noEmit — pass
e2e/delivery-location.spec.ts — added (dorm gate + room number)
e2e/order-flow.spec.ts — updated to select dorm before continue
```

## Rollback

```sql
ALTER TABLE "Order" DROP COLUMN IF EXISTS "deliveryLocation";
```

Revert app deploy to checkpoint tag `checkpoint/dorm-delivery-2026-08-19`.
