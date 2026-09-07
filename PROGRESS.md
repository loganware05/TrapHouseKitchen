# Progress

## Current status

Slice **15** (PWA web push) **implemented** on `feature/local-pwa-web-push` — validation evidence recorded; PR pending merge. Rollback: `checkpoint/pwa-web-push-2026-09-04`.

## Completed

- Slices 1–14 shipped (PRs #15–#30)
- Slice 15: Profile Web Push opt-in; VAPID + `PushSubscription`; notify Preparing / Ready / Out for delivery; tests + browser smoke evidence

## Next

1. Merge Slice 15 PR; set Render `VAPID_*` for live push
2. Waiting list: coupon message delivery; Capacitor/APNs; SMS; production Resend for reset email

## Blockers

- Live push delivery needs Render VAPID secrets (not in repo)
- Production reset email still needs Resend when ready (`SHOW_PASSWORD_RESET_LINK` is local/staging only)
