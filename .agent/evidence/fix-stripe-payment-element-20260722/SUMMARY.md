# Validation evidence — fix/local-stripe-payment-element-ready

**Plan:** `fix-stripe-payment-element-sandbox-2026-07-22` (APPROVED)  
**Date:** 2026-07-22

## Code changes
- `PaymentForm.tsx`: wait for Payment Element `onReady`; `elements.submit()` before `confirmPayment`; disable Pay until ready; surface load errors (incl. test/live key mismatch).
- `CheckoutSheet.tsx`: `key={clientSecret}` on `<Elements>` so tip/PI refreshes remount cleanly.

## Sandbox payment (local API + Stripe test mode)
See `sandbox-payment.json` (no secrets):
- Checkout created PaymentIntent in **test** mode
- Confirm with `pm_card_visa` → **`succeeded`** (amount 825 cents)
- Order `paymentStatus` still `PENDING` until webhook forward (expected without Stripe CLI)

## Policy
Pre-launch payment QA uses Stripe **test/sandbox** keys. Production Render keeps **live** keys for real customers. Publishable + secret must match mode.
