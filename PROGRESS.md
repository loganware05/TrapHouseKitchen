# Progress

## Current status

Slice **15** (PWA web push) **shipped and live** on `main` via PR [#31](https://github.com/loganware05/TrapHouseKitchen/pull/31) (`f7c4719`). Captain confirmed web deploy SW + order notifications work (2026-09-07).

## Completed

- Slices 1–15 shipped (PRs #15–#31)
- Profile Web Push opt-in; VAPID on Render; notify Preparing / Ready / Out for delivery; device smoke passed

## Next

1. Waiting list: coupon message delivery; Capacitor/APNs; SMS; production Resend for reset email

## Blockers

- Production reset email still needs Resend when ready (`SHOW_PASSWORD_RESET_LINK` is local/staging only)
