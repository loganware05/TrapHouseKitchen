# Progress

## Current status

Slice 8 (receipt-style dish reviews + stop review coupons) implemented on `feature/local-review-receipts`; validation passed; PR pending.

## Completed

- Slices 1–7 shipped (PRs #15–#22)
- Slice 8 implementation: receipts on Orders/Profile, `dishId` preselect, no $4 coupon on approve

## In progress

- Slice 8 PR

## Next

1. Merge Slice 8 PR
2. Slice 9: dynamic ETA (last in batch)

## Blockers

- Apple Pay device/domain gate from PR #14 still open
- Coupon apply-at-checkout reliability deferred (APIs kept; review no longer mints coupons)
