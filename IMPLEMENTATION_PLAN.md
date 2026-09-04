# Implementation Plan — Slice 15: PWA web push

## Metadata

- Status: **APPROVED — AWAITING CLOUD AGENT IMPLEMENTATION**
- Plan ID: `slice-15-pwa-web-push-2026-09-04`
- Depends on: PR [#30](https://github.com/loganware05/TrapHouseKitchen/pull/30) **merged** (`b6a5e0c` on `main`)
- Issue: `local/slice-15-pwa-web-push` (placeholder)
- Base: `origin/main` at `b6a5e0c`
- Branch: `feature/local-pwa-web-push` *(cloud agent creates)*
- Rollback checkpoint: *(cloud agent creates)*
- Created: 2026-09-04
- Last updated: 2026-09-04
- Execution: **Cursor Cloud Agent** (separate chat; browser validation expected)

## Prior delivery (closed)

| Slice | Scope | Status |
|-------|--------|--------|
| 13 | User-scoped query keys + clear cache on logout + login JWT race fix | **Shipped** — PR #30 |
| 14 | Non-prod forgot-password `resetUrl` helper | **Shipped** — PR #30 |

## Captain decisions (2026-09-04)

1. **Slice 15 approved** — implement now
2. **Push permission UX** — toggle on **Profile only** (not Orders)
3. **Notify statuses** — **Preparing**, **Ready**, **Out for delivery** only (not Completed, not Pending/Cancelled)
4. **Capacitor push** — waiting list (out of scope)
5. **Execution** — run in **Cursor Cloud Agent** (new chat) with browser testing

## Slice 15 — PWA web push

### Desired behavior

1. Customers can opt in to browser/PWA Web Push for order-status updates.
2. Permission UX is an explicit toggle on **Profile** only (never auto-prompt on first load / Orders).
3. Push only for authenticated customers who opted in; respect unsubscribe / logout / revoke.
4. Send notifications when an order status becomes **PREPARING**, **READY**, or **OUT_FOR_DELIVERY**.
5. Do not notify for Completed (or other statuses) in this slice.

### Non-goals

- Capacitor / APNs native push
- SMS
- Marketing or coupon campaign push
- Push toggle on Orders page
- Changing order lifecycle beyond notification hooks on status transitions

### Suggested technical outline (cloud agent may refine with evidence)

- VAPID keys via env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
- Persist push subscriptions per user (Prisma model)
- Service worker + subscribe/unsubscribe from Profile toggle
- Backend send on status change paths used by chef order pipeline
- Secure: only owner’s subscriptions; no cross-user leak (follow ADR-008/010 patterns)
- Tests + `.agent/evidence/` + docs updates (PROGRESS, TESTING, CHANGELOG, DECISIONS)

### Validation

- Unit/integration for subscribe + send gating by status
- Browser: enable toggle on Profile → permission → chef advances order through Preparing/Ready/Out for delivery → notification received (or logged in non-prod evidence)
- Security + accessibility review for Profile toggle
- Production build; never commit secrets

## Waiting list

- Coupon delivery via messaging/email campaign
- Capacitor native push (APNs)
- SMS notifications
- Marketing/email analytics
- Production Resend for password-reset email

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-09-04
- **Captain notes:** Approve Slice 15; Profile-only toggle; notify Preparing + Ready + Out for delivery; run in cloud agent with browser testing; Capacitor remains waiting list
