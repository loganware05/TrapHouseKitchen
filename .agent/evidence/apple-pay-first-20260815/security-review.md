# Security review — Apple Pay-first checkout

Date: 2026-08-15

## Scope

Frontend checkout UI only (`PaymentForm`, `CheckoutSheet`) plus Playwright payment-flow coverage. No backend PaymentIntent creation changes.

## Findings

| Severity | Finding | Status |
|----------|---------|--------|
| Pass | Stripe.js still initialized from `/api/payment/config` key alignment path (PR #13) | Preserved |
| Pass | No new secrets added to repo or client bundle | Pass |
| Pass | Express + fallback confirmations share one PaymentIntent / client secret | Pass |
| Pass | Double-submit guarded with processing ref | Pass |
| Info | Apple Pay domain registration remains an ops gate for production wallets | Open (Captain) |

## Residual risk

Apple Pay will not appear on unregistered domains or unsupported clients. That is expected Stripe behavior, not an authz bypass.
