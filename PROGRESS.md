# Progress

## Current status

Slices **13 + 14** on `feature/local-user-query-isolation` (PR #30). Follow-up: login token race + API/PWA no-store so coupons cannot leak across accounts. Slice 15 PWA push parked until Captain re-approves after merge.

## Completed

- Slices 1–12 shipped (PRs #15–#29)
- Slice 13/14 + cross-account coupon race fix (pending merge of PR #30)

## Next

1. Merge Slice 13–14 PR (#30) after retest: User A coupons → logout → User B → Orders shows only B
2. Captain: approve Slice 15 (Orders/Profile push toggle)
3. Waiting list: coupon message delivery; Capacitor/APNs; SMS

## Blockers

- Slice 15 blocked on post-13 approval
- Production reset email still needs Resend when ready (`SHOW_PASSWORD_RESET_LINK` is local/staging only)
