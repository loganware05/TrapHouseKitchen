# Progress

## Current status

Slices **13 + 14** implemented on `feature/local-user-query-isolation` — per-user React Query isolation + non-prod reset-link helper. Ready for PR. Slice 15 PWA push parked until Captain re-approves after merge.

## Completed

- Slices 1–12 shipped (PRs #15–#29)
- Slice 13/14 code + validation evidence (pending PR)

## Next

1. Open/merge Slice 13–14 PR
2. Captain: approve Slice 15 (Orders/Profile push toggle)
3. Waiting list: coupon message delivery; Capacitor/APNs; SMS

## Blockers

- Slice 15 blocked on post-13 approval
- Production reset email still needs Resend when ready (`SHOW_PASSWORD_RESET_LINK` is local/staging only)
