# Progress

## Current status

Slice 9 (dynamic ETA + chef prep intelligence) **closed** — PR #24 merged (`4af3519`); Render production verified green by Captain (2026-08-23).

Post-launch UX batch (Slices 1–9) is complete.

## Completed

- Slices 1–9 shipped and ops-verified (PRs #15–#24)
- Post-launch UX batch: cart, chef nav, payments, dorm delivery, OUT_FOR_DELIVERY, live tracking, pull-to-refresh, receipt reviews, dynamic ETA / prep intelligence (incl. 15s chef kitchen poll)
- Slice 9 production: migration applied, `PREP_LEARNING_ENABLED=0`, Render deploy green

## In progress

- None (awaiting next slice selection)

## Next

1. Coupon apply-at-checkout fix (deferred from Slice 8)
2. Apple Pay domain gate (PR #14 follow-up)
3. Slice 10+ TBD — operating hours, webhook emails, or Captain priority

## Blockers

- Apple Pay device/domain gate from PR #14 still open
- Coupon apply-at-checkout reliability deferred
