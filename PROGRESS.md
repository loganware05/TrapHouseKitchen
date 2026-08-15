# Progress

## Current status

Apple Pay-first checkout is implemented on `feature/local-apple-pay-first-checkout` and validated locally (frontend build, 49 backend tests, 3 Playwright payment-flow tests). Waiting on Captain-assisted Stripe domain registration + Apple device sandbox confirmation before treating the feature as fully production-ready for wallets.

## Completed

- Approved plan `feature-apple-pay-first-checkout-2026-08-15`
- Rollback checkpoint `checkpoint/apple-pay-first-checkout-2026-08-15`
- Express Checkout Element with Apple Pay ordered first
- Card / other-method fallback retained below a divider when wallets are available
- Checkout CTA renamed to review-first “Continue to payment”
- Payment E2E coverage for success, decline, and unsupported-wallet fallback
- Evidence package under `.agent/evidence/apple-pay-first-20260815/`

## In progress

- PR open/merge blocked until GitHub CLI re-authentication (`gh auth refresh`)
- Captain-assisted Apple Pay domain + device sandbox confirmation

## Next

1. Register payment-method domain(s) in Stripe sandbox/live
2. Captain validates Apple Pay button + sandbox charge on a compatible Apple device
3. Open/merge PR for `feature/local-apple-pay-first-checkout`
4. Receive Captain’s sequential change list and gate each item with E2E

## Blockers

- GitHub CLI token invalid for this machine
- Real Apple Pay confirmation cannot be completed from Chromium Playwright alone
