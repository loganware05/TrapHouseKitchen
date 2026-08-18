---
name: checkout-payments
description: Stripe PaymentIntent lifecycle, webhook truth, unpaid-order visibility, and abandoned-checkout cleanup for TrapHouse Kitchen checkout.
---

# Checkout & Payments

## Order creation model

1. `POST /api/orders/checkout` creates an **UNPAID** order row, then a PaymentIntent (`paymentStatus` → `PENDING`).
2. Payment truth comes from Stripe webhooks, not client callbacks.
3. Single-order GET (`GET /api/orders/:id`) stays **unfiltered** so confirmation/tracking works during checkout.

## List visibility

Customer and chef **list** queries must only include:

- `PAID`
- `REFUNDED`
- `PARTIALLY_REFUNDED`

Exclude `UNPAID`, `PENDING`, and `FAILED` from lists. Constants live in `backend/src/services/orderVisibility.ts` (`ORDER_LIST_VISIBLE_PAYMENT_STATUSES`).

## Webhook handlers

| Event | Order effect |
|-------|----------------|
| `payment_intent.succeeded` | Mark paid; finalize coupon; notify chef |
| `payment_intent.payment_failed` | `paymentStatus` → `FAILED` (hidden from lists) |
| `payment_intent.canceled` | Payment record canceled; if not paid, `status` → `CANCELLED` (no email) |

In development/test without `STRIPE_WEBHOOK_SECRET`, unsigned JSON payloads are accepted — never in production.

## Abandoned checkout cleanup

- Job: `cancelAbandonedUnpaidOrders()` in `order.service.ts`
- Scheduler: `startAbandonedOrderCleanup()` in `backend/src/jobs/abandonedOrderCleanup.ts`, started from `index.ts`
- Rule: orders with `paymentStatus` `UNPAID` or `PENDING`, not already `CANCELLED`, older than **30 minutes** → `status` `CANCELLED`
- Sweep interval: every **5 minutes**

## Validation checklist

- Integration: `backend/tests/integration/unpaid-order-visibility.test.ts`
- Keep `e2e/payment-flow.spec.ts` green (declined card does not lose cart)
- Run `backend npm run test:all`
- Script sanity: `npx tsx backend/scripts/test-order-filter.ts`

## Pitfalls

- Do not filter single-order GET by payment status — breaks checkout confirmation polling.
- Do not cancel already-`PAID` orders on `payment_intent.canceled`.
- Chef list previously included `PENDING`; that exposed unpaid checkouts — treat as a bug.
