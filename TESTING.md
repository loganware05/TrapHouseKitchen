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

Latest: **49/49 passed** (2026-08-15, Apple Pay-first branch).

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

## Manual checks

- Stripe Payment Method Domains: register `traphousekitchen-web.onrender.com` (sandbox + live)
- Safari / Apple device: confirm Apple Pay button appears and sandbox payment succeeds
- Confirm fallback card path still works when Apple Pay is unavailable

## Evidence location

`.agent/evidence/apple-pay-first-20260815/`

`.agent/evidence/cart-ux-polish-20260815/`

`.agent/evidence/chef-nav-active-20260817/`
