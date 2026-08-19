# Progress

## Current status

PR #16 (Slice 2 Chef nav active-state) is **merged**. Slice 3 (payment-failure hardening) is implemented on `fix/local-unpaid-order-visibility`, locally validated, PR pending.

## Completed

- Apple Pay-first checkout shipped via PR #14 (evidence: `.agent/evidence/apple-pay-first-20260815/`)
- Slice 1 cart/menu UX shipped via PR #15 (evidence: `.agent/evidence/cart-ux-polish-20260815/`)
- Slice 2 Chef nav active-state shipped via PR #16 (evidence: `.agent/evidence/chef-nav-active-20260817/`)
- Slice 3: unpaid/failed orders hidden from customer and chef lists; canceled PaymentIntent cancels order; abandoned unpaid cleanup job
- Added `checkout-payments` skill
- Slice 3 validation: backend 55/55; integration unpaid-order-visibility 6/6; order-filter script pass

## In progress

- Slice 3 PR open/review

## Next

1. Merge Slice 3 PR
2. Slice 4: dorm delivery location

## Blockers

- Apple Pay device/domain gate from PR #14 still open (Stripe Payment Method Domains registration + Apple device sandbox confirmation)
