# Stripe publishable/secret mismatch — evidence

**Date:** 2026-08-04  
**Plan:** `fix-stripe-pk-sk-mismatch-2026-08-04`

## Diagnosis (production)

| Source | Mode | Notes |
|--------|------|-------|
| API `/health` | — | **200**, database connected |
| API `/api/dishes` | — | **200** (2 dishes) |
| API `/api/payment/config` | **test** | Publishable key mode test |
| Web static bundle | **live** | Baked `pk_live_…` at build time |

Error symptom: `client_secret` does not match PaymentIntent on this account — Elements used live pk while API created test-mode PaymentIntents.

## Fix

Frontend `getStripePromise()` loads publishable key from `/api/payment/config` (fallback: `VITE_STRIPE_PUBLISHABLE_KEY`). Backend logs if `sk_` / `pk_` modes disagree.

## Captain follow-up (Render)

Keep API `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` as a matching pair (both test or both live, same account). After merging this fix, redeploy **web** so the new Stripe loader ships; runtime config then tracks the API key.
