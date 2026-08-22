---
name: order-lifecycle
description: Order status machine, Prisma enum migrations, Chef transitions, customer tracking labels, and live polling
---

# Order lifecycle

## Use this Skill when

Changing `OrderStatus`, Chef fulfillment buttons, customer status labels/trackers, status emails, transition validation, or customer order polling.

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

## Dynamic prep time (Slice 9+)

- Checkout ETA: `5 + Σ(dish.prepTime × qty) + queue load + learning bias` (clamped 15–120 min)
- Queue counts paid, non-archived PENDING/PREPARING/READY (excluding current order); READY weighted lower (2 min vs 8)
- `Order.prepTime` snapshot at PaymentIntent; `prepTimeSource` = `AUTO` | `CHEF_OVERRIDE`
- Chef: `GET /api/orders/prep-intelligence`, `PATCH /api/orders/:id/prep-time`
- Learning: observations on COMPLETED; bias applies only when `PREP_LEARNING_ENABLED=1` and ≥ min samples

## Client polling (Slice 6+)

- Interval: `CUSTOMER_ORDER_POLL_MS` = **15s** (`frontend/src/lib/customerOrders.ts`)
- **List** (`customerOrdersQueryOptions`): poll while any order is `isActiveCustomerOrder` (PAID && not COMPLETED/CANCELLED)
- **Confirmation** (`customerOrderQueryOptions`): poll while `shouldPollCustomerOrder` (not COMPLETED/CANCELLED); includes unpaid settle path
- Confirmation syncs into list cache via `syncCustomerOrderIntoListCache` so Home/Orders stay consistent
- Use `refetchIntervalInBackground: true` so status keeps updating when the tab is not focused (Chef working in another window)
- Do not flash full-page loading on background refetches (use React Query `isLoading` for initial only)
- Prefer polling over websockets unless a later plan explicitly adds realtime transport
- Protected routes should wait for zustand persist hydration + `fetchUser` when a token exists (otherwise refresh of `/orders/:id` bounces to login)

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
| Dynamic ETA | `backend/src/services/prepTime.service.ts` |
| Prep learning | `backend/src/services/prepTimeLearning.service.ts` |
| Chef prep UI | `frontend/src/components/chef/PrepTimeEditor.tsx`, `KitchenQueueSummary.tsx` |
| Chef UI | `frontend/src/pages/chef/ChefOrdersPage.tsx` |
| Labels / polling | `frontend/src/lib/customerOrders.ts` |
| Tracker | `frontend/src/components/OrderTracker.tsx` |
| Confirmation | `frontend/src/pages/OrderConfirmationPage.tsx` |
| Emails | `backend/src/services/emailService.ts` |
| Live E2E | `e2e/order-tracking.spec.ts` |

## Validation

- Unit: transition matrix
- Integration: illegal skip returns 400; full walk to COMPLETED sets `completedAt`
- E2E: Chef advances while customer confirmation stays open; status updates without reload (~25s poll window)

## Prohibited

- Do not allow Chef to skip steps via API.
- Do not set review-eligible status before `COMPLETED`.
- Do not introduce websockets without a new approved plan.
