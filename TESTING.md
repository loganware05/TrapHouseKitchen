# Testing

## Test commands

```bash
# Backend
cd backend && npm run test:all

# Frontend production build
npm run build --prefix frontend

# Checkout payment E2E (local API + Vite already running)
PLAYWRIGHT_PAYMENT_TESTS=1 \
VITE_STRIPE_PUBLISHABLE_KEY=runtime-api-key \
PLAYWRIGHT_BASE_URL=http://localhost:5173 \
PLAYWRIGHT_API_URL=http://localhost:3001 \
PLAYWRIGHT_SKIP_WEBSERVER=1 \
npx playwright test e2e/payment-flow.spec.ts --project=chromium
```

## Unit tests

Backend Vitest unit suite under `backend/tests/unit` — included in `npm run test:all`.

## Integration tests

Backend Vitest integration suite under `backend/tests/integration` — requires local Postgres (`traphouse-postgres`).

Latest: **48/48 passed** in focused Slice 5 run (2026-08-20); full suite includes new `order-status-transitions.test.ts`.

Notable files: `unpaid-order-visibility.test.ts`, `delivery-location.test.ts`, `order-status-transitions.test.ts`.

### Slice 9 — dynamic ETA + prep intelligence

- `backend/tests/unit/prepTime.test.ts`: formula, queue weights, learning helpers
- `backend/tests/integration/prep-time.test.ts`: prep-intelligence, chef override, observation on complete
- Chef live poll: `frontend/src/lib/chefKitchen.ts` (`CHEF_KITCHEN_POLL_MS` = 15s, shared with customer)
- Evidence: `.agent/evidence/dynamic-eta-20260822/validation.md`
- Production: Render verified green 2026-08-23 (Captain); ops closed

### Slice 11 — customer nav, unified reviews, PTR

- Layout-level pull-to-refresh via `PullToRefreshContext`
- Skill: `.cursor/skills/ios-pull-to-refresh/SKILL.md`
- Integration: `review-flow.test.ts` edit re-approval cases
- Evidence: `.agent/evidence/customer-nav-reviews-ptr-20260830/validation.md`

### Slice 12 — password reset + payment hardening

- `backend/tests/integration/auth-routes.test.ts`: forgot/reset with SHA-256 hashed tokens
- `backend/tests/unit/passwordResetToken.test.ts`, `payment.service.test.ts`, `webhook-stripe.test.ts`
- E2E: `e2e/auth-flow.spec.ts` forgot → reset → login; API must run with `E2E_CAPTURE_PASSWORD_RESET=1` (set in `playwright.config.ts` webServer). Token read via `backend/scripts/e2e-read-reset-token.ts` from `.agent/e2e-capture/password-reset/`
- Evidence: `.agent/evidence/prelaunch-stripe-20260901/validation.md`

### Slice 13–14 — per-user cache isolation + non-prod reset link

- Frontend: user-scoped React Query keys (`authQueryKeys.ts` / `customerOrders.ts`); `queryClient.clear()` on login/logout/register/guest
- Critical: `localStorage` token is set **before** Zustand user update (`authSessionToken.selftest.ts`)
- Selftest: `npx tsx frontend/src/lib/authQueryKeys.selftest.ts` and `npx tsx frontend/src/lib/authSessionToken.selftest.ts`
- Non-prod: `SHOW_PASSWORD_RESET_LINK=1` returns `data.resetUrl` from forgot-password (ignored in production); UI shows copyable link
- Backend: `GET /coupons/my` is user-scoped + `Cache-Control: private, no-store`; integration covers two-user isolation
- PWA: API routes use Workbox `NetworkOnly` (no cross-session JSON cache)
- Evidence: `.agent/evidence/user-query-isolation-20260903/validation.md`

### Slice 15 — PWA web push

- Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (see `backend/.env.example`; never commit private keys)
- Unit: `backend/tests/unit/pushNotification.test.ts` — status gating + ownership
- Integration: `backend/tests/integration/push-subscriptions.test.ts` — subscribe, cross-user 403, send on PREPARING/READY/OUT_FOR_DELIVERY, no send on COMPLETED, unsubscribe all
- Frontend selftest: `npx tsx frontend/src/lib/webPush.selftest.ts`
- Profile: `PushNotificationToggle` (`role="switch"`) — permission only on explicit toggle
- SW: `public/push-handler.js` imported by Workbox (`vite.config.ts`)
- Evidence: `.agent/evidence/slice-15-pwa-web-push-20260904/`
- Same-status no-ops do not re-send push/email; logout clears JWT before best-effort push revoke (2s cap)

## End-to-end tests

`e2e/payment-flow.spec.ts`:

- Success card → order confirmation
- Declined / insufficient-funds card → cart retained
- Unsupported-wallet Chromium client → Payment Element fallback usable

Latest: **3/3 passed** with local sandbox Stripe keys via `/api/payment/config`.

### Slice 1 — cart and menu UX polish

- `e2e/order-flow.spec.ts` + `e2e/ai-flow.spec.ts` (Chromium): **4/4 passed** (Home/Profile meal-builder removal + add-to-cart header flow)
- Profile screenshot: `.agent/evidence/cart-ux-polish-20260815/profile-no-meal-builder.png`
- `e2e/mobile.spec.ts` (iPhone 13 / WebKit): **2/2 passed**
- `e2e/payment-flow.spec.ts` (Stripe sandbox): **3/3 passed**
- `e2e/coupon-flow.spec.ts`: valid, expired, and invalid coupon scenarios passed after `npm run e2e:seed`
- Mobile screenshot: `.agent/evidence/cart-ux-polish-20260815/mobile-header-cart.png`

### Slice 2 — chef nav active-state

- `e2e/chef-flow.spec.ts` (Chromium): **2/2 passed**
- `e2e/mobile.spec.ts` chef bottom nav (iPhone 13): **1/1 passed**
- Screenshot: `.agent/evidence/chef-nav-active-20260817/chef-orders-nav-active.png`

### Slice 3 — payment-failure hardening

- `backend/tests/integration/unpaid-order-visibility.test.ts`: **6/6 passed**
- `npx tsx backend/scripts/test-order-filter.ts`: pass
- `e2e/payment-flow.spec.ts`: unchanged checkout decline behavior (re-run with `PLAYWRIGHT_PAYMENT_TESTS=1` + sandbox keys when validating full Stripe path)

### Slice 4 — dorm delivery location

- `backend/tests/integration/delivery-location.test.ts`: **4/4 passed**
- `e2e/delivery-location.spec.ts`: dorm required + East room number gate
- `e2e/order-flow.spec.ts`: updated to select dorm before continue

### Slice 5 — out for delivery

- `backend/tests/unit/orderStatusTransitions.test.ts`: transition matrix
- `backend/tests/integration/order-status-transitions.test.ts`: skip rejected; full walk to COMPLETED
- `e2e/chef-flow.spec.ts`: Start Preparing → Mark Ready → Out for delivery → Complete
- Evidence: `.agent/evidence/out-for-delivery-20260820/validation.md`

### Slice 6 — live order tracking

- `e2e/order-tracking.spec.ts`: Chef advances while customer confirmation stays open; Preparing appears without reload (≤25s poll window)
- Evidence: `.agent/evidence/live-order-tracking-20260820/validation.md`

### Slice 7 — pull-to-refresh

- Logic selftest: `cd frontend && npx tsx src/lib/pullToRefreshLogic.selftest.ts`
- Surfaces: Home, Menu, Orders, Chef dashboard, Chef orders via `PullToRefresh`
- `e2e/mobile.spec.ts`: best-effort touch pull on Orders (iPhone 13 project)
- Evidence: `.agent/evidence/pull-to-refresh-20260820/validation.md`

### Slice 8 — receipt-style dish reviews

- Helpers: `cd frontend && npx tsx src/lib/orderReceipt.selftest.ts`
- Integration: `cd backend && npx vitest run tests/integration/review-flow.test.ts` (approve does not create coupons)
- E2E: `npm run e2e:seed && PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://localhost:5173 npx playwright test e2e/review-receipts.spec.ts --project=chromium`
- Evidence: `.agent/evidence/review-receipts-20260821/validation.md`

### Slice 10 — coupon gateways

- `backend/tests/integration/coupon-gateways.test.ts`: gateway toggle/amount, mint on approve, no mint when off, soft reservation
- `backend/tests/integration/review-flow.test.ts`: approve mints coupon when gateway enabled
- Evidence: `.agent/evidence/coupon-gateways-20260826/validation.md`

## Manual checks

- Stripe Payment Method Domains: register `traphousekitchen-web.onrender.com` (sandbox + live)
- Safari / Apple device: confirm Apple Pay button appears and sandbox payment succeeds
- Confirm fallback card path still works when Apple Pay is unavailable

### Slice 16 — release gaps + payment finalization

- Unit: `backend/tests/unit/jwtConfig.test.ts`, `auth.middleware.tokenVersion.test.ts`, updated `auth.service.test.ts`
- Integration: `webhook-stripe.test.ts` — late success after PREPARING keeps status and marks PAID
- Seed: production refuse without `ALLOW_PRODUCTION_SEED=1`; Render startCommand no longer seeds
- Ops: `backend/scripts/set-user-password.ts` for Chef rotation
- Evidence: `.agent/evidence/slice-16-release-gaps-20261105/`

### Slice 17 — payment safety matrix

- Service: transactional `finalizeSuccessfulPayment` (FOR UPDATE); `finalizeChargeRefunded`; failed finalize does not downgrade PAID
- Migration: `20261109120000_unique_stripe_refund_id`
- Integration (`webhook-stripe.test.ts`): concurrent finalize; late `payment_failed` after PAID; idempotent `charge.refunded`; decline→retry; sticky refund after REFUNDED
- CI (source of truth for integration): main [run 42685302101](https://github.com/loganware05/TrapHouseKitchen/actions/runs/42685302101) on `a195175`; PR [run 42679402003](https://github.com/loganware05/TrapHouseKitchen/actions/runs/42679402003)
- Evidence: `.agent/evidence/slice-17-payment-safety-20261109/`
- XRV / Pilot A checklist: `.agent/evidence/slice-17-xrv-pilot-a-20261111/validation.md`

## Evidence location

`.agent/evidence/apple-pay-first-20260815/`

`.agent/evidence/cart-ux-polish-20260815/`

`.agent/evidence/chef-nav-active-20260817/`

`.agent/evidence/out-for-delivery-20260820/`

`.agent/evidence/live-order-tracking-20260820/`

`.agent/evidence/pull-to-refresh-20260820/`

`.agent/evidence/review-receipts-20260821/`
