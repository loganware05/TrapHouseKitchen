# Implementation Plan — Post–Slice 12: per-user data isolation, email smoke, PWA push

## Metadata

- Status: **APPROVED — IN IMPLEMENTATION** (Slices 13 + 14)
- Plan ID: `slice-13-plus-isolation-email-push-2026-09-02`
- Depends on: PR [#29](https://github.com/loganware05/TrapHouseKitchen/pull/29) **merged** (`74429c8` on `main`)
- Issue: `local/post-slice-12-isolation-email-push` (placeholder)
- Base: `origin/main` at `74429c8`
- Branch: `feature/local-user-query-isolation`
- Rollback checkpoint: `checkpoint/user-query-isolation-2026-09-03`
- Created: 2026-09-02
- Last updated: 2026-09-03

## Captain decisions (2026-09-03)

1. **PR #29 merged** — yes
2. **Slice 13** — approved (per-user React Query isolation)
3. **Password-reset smoke** — **Option B**: non-prod “show reset link” helper (**Slice 14**)
4. **Slice 15** (PWA push) — **deferred** until Captain sees and merges Slice 13
5. **Push permission UX** (when 15 approved) — toggle on **Orders/Profile**
6. **Capacitor push** — waiting list

## Delivery (this PR)

| Slice | Scope | Status |
|-------|--------|--------|
| 13 | User-scoped query keys + clear cache on logout | **Done** |
| 14 | Non-prod forgot-password response includes `resetUrl` when flagged | **Done** |
| 15 | PWA web push | Parked — await post-13 approval |

## Slice 13 — Per-user client cache isolation

### Desired behavior

1. Coupon saved/used lists and customer orders always belong to the **current** session user.
2. Logout (and login as a different user) clears auth-scoped React Query caches.
3. Query keys include `userId` for `myCoupons`, `orders`, `myReviews`, `userProfile`, `userSpend`, `eligibleOrders`, and spend-tracker.

### Non-goals

- Coupon schema / minting; message-system coupon delivery; Slice 15 push

## Slice 14 — Non-prod show reset link

### Desired behavior

1. When `NODE_ENV !== 'production'` **and** `SHOW_PASSWORD_RESET_LINK=1`, `POST /api/auth/forgot-password` includes `data.resetUrl` (and optionally `data.resetToken`) in the JSON response for the requested email when a user exists.
2. Forgot-password UI shows a copyable reset link when the API returns `resetUrl`.
3. Production never returns the link regardless of env flag.

### Non-goals

- Open/click tracking; marketing email; production debug endpoint

## Slice 15 (parked)

- Order-status web push; permission toggle on Orders/Profile; Capacitor on waiting list.
- Re-approve after Slice 13 merge.

## Waiting list

- Coupon delivery via messaging/email campaign
- Capacitor native push (APNs)
- SMS notifications
- Marketing/email analytics

## Approval Record

- **Status:** APPROVED (13 + 14); Slice 15 pending
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-09-03
- **Captain notes:** Merge #29 done; Slice 13 next; Option B reset-link helper; Slice 15 after 13 merge; push toggle on Orders/Profile; Capacitor push waiting list
