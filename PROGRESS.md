# Progress

## Current status

Slice **15** (PWA web push) **approved** 2026-09-04 — Profile-only toggle; notify Preparing / Ready / Out for delivery. Execution assigned to a **Cursor Cloud Agent** (new chat). Local First Mate is not implementing product code for this slice.

## Completed

- Slices 1–14 shipped (PRs #15–#30)
- Per-user React Query isolation, login JWT race fix, non-prod password-reset link helper

## Next

1. Cloud agent: branch + checkpoint + implement Slice 15 + browser evidence + PR
2. Waiting list: coupon message delivery; Capacitor/APNs; SMS; production Resend for reset email

## Blockers

- Cloud agent needs repo access on `main` at `b6a5e0c` (or later) and any VAPID/env secrets for real push smoke
- Production reset email still needs Resend when ready (`SHOW_PASSWORD_RESET_LINK` is local/staging only)
