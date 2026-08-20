# Implementation Plan — Slice 5: Out for delivery

## Metadata

- Status: **APPROVED**
- Plan ID: `slice-5-out-for-delivery-2026-08-20`
- Parent plan: `post-launch-ux-batch-2026-08-15` (Slices 1–4 complete; PR #18 merged)
- Issue: [#19](https://github.com/loganware05/TrapHouseKitchen/issues/19)
- Base: `origin/main` after PR #18 (`78845c2`)
- Branch: `feature/local-out-for-delivery`
- Rollback checkpoint: `checkpoint/out-for-delivery-2026-08-20` (`78845c2`)
- Created: 2026-08-20
- Last updated: 2026-08-20

## Request

Continue the post-launch UX batch with **Slice 5 — Order status expansion**: add `OUT_FOR_DELIVERY` so every order flows Placed → Preparing → Ready → Out for delivery → Complete.

## Captain decisions

| Topic | Decision |
|-------|----------|
| Delivery model | Delivery only — all orders go through Out for delivery |
| Customer PENDING label | “Placed” |
| OrderTracker | **A** — expand to five steps in this slice |
| Transitions | Strict linear forward-only (+ CANCELLED from non-terminal) |
| Email | Yes — Out for delivery email when status advances |

## Scope

### In scope

- Prisma enum + additive migration for `OUT_FOR_DELIVERY`
- Server transition validation used by Chef `PATCH`
- Chef order actions + badge colors
- Customer labels, badges, five-step OrderTracker
- Email copy for `OUT_FOR_DELIVERY`
- Fix READY label “Ready for pickup” → “Ready”
- Tests, E2E, skill, docs, evidence

### Out of scope

- Live polling refinements (Slice 6)
- Dynamic ETA (Slice 9)
- Dorm validation-message polish (stashed separately)

## Acceptance criteria

- [x] DB enum includes `OUT_FOR_DELIVERY`
- [x] Chef advances PENDING → PREPARING → READY → OUT_FOR_DELIVERY → COMPLETED
- [x] Illegal jumps return 400
- [x] Customer labels: Placed, Preparing, Ready, Out for delivery, Completed
- [x] Status emails include OUT_FOR_DELIVERY
- [x] Reviews still require COMPLETED + PAID
- [x] Validation green; evidence + docs updated

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-08-20
- **Defaults accepted:** five-step tracker, strict linear transitions, out-for-delivery email
