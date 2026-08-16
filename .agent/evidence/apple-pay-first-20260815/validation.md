# Validation Evidence — Apple Pay-first checkout

Date: 2026-08-15  
Plan: `feature-apple-pay-first-checkout-2026-08-15`  
Branch: `feature/local-apple-pay-first-checkout`  
Rollback checkpoint: `checkpoint/apple-pay-first-checkout-2026-08-15` (`89ffd94`)

## Commands and results

| Layer | Command | Result |
|-------|---------|--------|
| Frontend build / static | `npm run build --prefix frontend` | Pass |
| Backend unit + integration | `cd backend && npm run test:all` | Pass — 49/49 |
| Checkout E2E | `PLAYWRIGHT_PAYMENT_TESTS=1 … npx playwright test e2e/payment-flow.spec.ts --project=chromium` | Pass — 3/3 |

## E2E coverage

1. Success card completes checkout and reaches order confirmation
2. Declined / insufficient-funds card keeps the checkout cart
3. Unsupported-wallet Chromium clients retain a usable Payment Element fallback

## Screenshots

- `.agent/evidence/apple-pay-first-20260815/checkout-fallback-chromium.png`

## Remaining gates (Captain-assisted)

- Register `traphousekitchen-web.onrender.com` under Stripe Payment Method Domains (sandbox + live)
- Confirm Apple Pay button visibility + sandbox charge on a compatible Apple device / Safari
- Confirm live-mode domain registration before accepting real Apple Pay payments
