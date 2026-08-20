---
name: order-lifecycle
description: Order status machine, Prisma enum migrations, Chef transitions, and customer tracking labels
---

# Order lifecycle

## Use this Skill when

Changing `OrderStatus`, Chef fulfillment buttons, customer status labels/trackers, status emails, or transition validation.

## Status machine (Slice 5+)

```
PENDING → PREPARING → READY → OUT_FOR_DELIVERY → COMPLETED
         ↘ CANCELLED (from any non-cancelled status)
```

- Customer labels: Placed / Preparing / Ready / Out for delivery / Completed / Cancelled
- Chef advances one step at a time via `PATCH /api/orders/:id/status`
- Server enforces transitions in `assertValidOrderStatusTransition` (`orderStatusTransitions.ts`), called from `setOrderStatus`
- Same-status updates are allowed (payment sync may re-assert `PENDING`)
- Reviews require `COMPLETED` + `PAID`

## Enum migration pattern

1. Add value to Prisma `OrderStatus` enum.
2. Additive SQL: `ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'NEW_VALUE' BEFORE 'COMPLETED';`
3. Do not remove enum values in production without a dedicated rollback plan; leave unused values if rolling back the app.

## Key files

| Concern | Path |
|---------|------|
| Schema | `backend/prisma/schema.prisma` |
| Transitions | `backend/src/services/orderStatusTransitions.ts` |
| Writer | `backend/src/services/order.service.ts` → `setOrderStatus` |
| Chef UI | `frontend/src/pages/chef/ChefOrdersPage.tsx` |
| Labels | `frontend/src/lib/customerOrders.ts` |
| Tracker | `frontend/src/components/OrderTracker.tsx` |
| Emails | `backend/src/services/emailService.ts` |

## Validation

- Unit: transition matrix
- Integration: illegal skip returns 400; full walk to COMPLETED sets `completedAt`
- E2E: Chef Start Preparing → Mark Ready → Out for delivery → Complete

## Prohibited

- Do not allow Chef to skip steps via API.
- Do not set review-eligible status before `COMPLETED`.
- Do not silently expand into live-polling work (Slice 6) without plan approval.
