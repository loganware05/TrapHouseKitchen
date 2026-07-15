# TrapHouse Kitchen — Support Playbooks

Operational guide for common customer complaints. Adjust log paths and dashboards to your hosting (Render, AWS, Vercel, etc.).

---

## Shared investigation tools

| Tool | Use |
|------|-----|
| **Stripe Dashboard** | Payments, PaymentIntents, Customers, webhook delivery, refund |
| **Application logs** | API container/service logs (HTTP 4xx/5xx, stack traces) |
| **Database (Prisma / SQL)** | `Order`, `Payment`, `Transaction`, `Coupon`, `AIInteraction` tables |
| **Request ID** | Check `x-request-id` response header; correlate with logs |

---

## 1. “Payment succeeded but I don’t see my order”

**User complaint:** Charged / Stripe shows success; app has no order or still “pending”.

**Likely causes**

- Webhook not received or failed (signature, URL, worker down).
- Order created but status not updated after `payment_intent.succeeded`.
- Customer logged into a different account than the one that placed the order.
- Success redirect before webhook processed (race).

**Investigation**

1. In **Stripe** → PaymentIntent: note `id`, amount, `customer` metadata (if any), `metadata.orderId` if you set it.
2. In **DB**: find `Payment` / `Order` by `stripePaymentIntentId` or amount + time window + `userId`.
3. Check **webhook logs** in Stripe (Developers → Webhooks) for delivery status and response body.
4. Search API logs for that PI id and `/api/webhooks/stripe`.

**Resolution**

- Replay webhook from Stripe Dashboard if safe and idempotent.
- Manually reconcile: set `Order.paymentStatus` / `Order.status` per business rules and notify customer.
- Fix webhook secret (`STRIPE_WEBHOOK_SECRET`) and URL in production.

---

## 2. “I was charged twice” (duplicate charges)

**Likely causes**

- Double submission (user double-click; two PaymentIntents).
- Retried request without idempotency.
- Bug creating two orders for one checkout.

**Investigation**

1. Stripe: list charges / PIs for the customer in the time window; compare amounts.
2. DB: `Order` rows for same `userId` with same `finalAmount` and close `createdAt`.
3. Check `Transaction.stripeChargeId` uniqueness and API logs for duplicate `POST /orders/checkout` or payment confirm.

**Resolution**

- If duplicate **unintentional** charge: refund per policy in Stripe.
- Harden UI (disable Pay while loading); ensure backend idempotency keys where applicable.
- Document latency: single PI might show “processing” twice in UI if polling is wrong—verify.

---

## 3. “My coupon didn’t apply”

**Likely causes**

- Coupon expired, already used, wrong code, or not owned by user (if restricted).
- Coupon validated in UI but order created without `appliedCoupon` linkage.
- Discount calculated incorrectly vs server.

**Investigation**

1. DB: `Coupon` by `code`; check `expiresAt`, `usedAt`, `userId`.
2. `Order` record: `appliedCouponId` / relation and `finalAmount` vs `totalPrice` + tip − discount.
3. API logs: `/api/coupons/validate`, `/api/coupons/apply`, `/api/orders/checkout`.

**Resolution**

- If valid per policy: manual adjustment (partial refund or credit) and fix apply-order linkage bug.
- Communicate eligibility rules clearly on failure toasts.

---

## 4. “AI picked the wrong food”

**Likely causes**

- Model hallucination or outdated menu context.
- Budget constraints excluding preferred items.
- Stale dish list in prompt.

**Investigation**

1. DB: `AIInteraction` for `userId` / `orderId` — prompt, response payload, timestamps.
2. Compare recommended `dishId`s to current `Dish` availability and price.
3. Check AI provider logs/errors and timeouts in API logs.

**Resolution**

- Apologize; offer manual cart fix or small credit.
- Tune prompts, enforce “only use provided menu JSON”, add server-side validation of returned IDs.
- Feature flag AI off if provider unstable.

---

## 5. “My order is stuck on Pending”

**Likely causes**

- Payment not completed or webhook missed → `PAID` never set.
- Chef never advanced status (operational).
- Stuck in `REQUIRES_ACTION` (3DS) abandoned.

**Investigation**

1. DB: `Order.status`, `Order.paymentStatus`; related `Payment` rows and PI status fields.
2. Stripe: PI status for that order’s PI.
3. Chef queue: is order visible under `/chef/orders`?

**Resolution**

- If **unpaid**: guide customer to pay or cancel order.
- If **paid**, webhook issue: replay webhook or manually set statuses.
- If **operational**: chef picks up order; normalize SOP.

---

## 6. “The app crashed / white screen during checkout”

**Likely causes**

- Uncaught React error (missing data shape).
- Stripe.js load failure (bad publishable key, CSP, ad blocker).
- Network drop mid-request.

**Investigation**

1. Browser console for the user (if available) or reproduce in staging with same browser.
2. Frontend error tracking (Sentry, etc.) if configured.
3. API logs for 500s on checkout or payment routes.
4. Verify `VITE_STRIPE_PUBLISHABLE_KEY` matches mode (test vs live) and domain.

**Resolution**

- Hotfix `ErrorBoundary` and null guards; redeploy.
- Clear cache / different browser quick test for user.
- If charge went through, reconcile via Playbook **1**.

---

## Escalation template

```
Customer:
Order ID (if any):
Stripe PI / charge ID (if any):
Approx time (timezone):
Screenshots:
Steps taken from playbook:
```
