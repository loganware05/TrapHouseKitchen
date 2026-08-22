# Progress

## Current status

Slice 9 (dynamic ETA + chef prep intelligence) implemented on `feature/local-dynamic-eta` — validation green; PR pending.

Slice 8 (receipt-style dish reviews + community preview) merged via PR #23 (`37a7470`).

## Completed

- Slices 1–8 shipped (PRs #15–#23)
- Post-launch UX batch: cart, chef nav, payments, dorm delivery, OUT_FOR_DELIVERY, live tracking, pull-to-refresh, receipt reviews
- Slice 9 implementation: dynamic checkout ETA, chef override, learning orchestrator (env-gated), chef UI

## In progress

- Open PR for Slice 9 from `feature/local-dynamic-eta`

## Next

1. Captain review + merge Slice 9 PR
2. Render: apply migration + deploy API; keep `PREP_LEARNING_ENABLED=0` until soft-launch volume
3. Post-batch: coupon apply-at-checkout fix, Apple Pay domain gate, Slice 10+ TBD

## Blockers

- Apple Pay device/domain gate from PR #14 still open
- Coupon apply-at-checkout reliability deferred
