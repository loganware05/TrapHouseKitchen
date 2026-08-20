# Implementation Plan — Slice 6: Live order tracking

## Metadata

- Status: **APPROVED**
- Plan ID: `slice-6-live-order-tracking-2026-08-20`
- Parent plan: `post-launch-ux-batch-2026-08-15` (Slices 1–5 complete; PR #20 merged)
- Issue: `local/live-order-tracking`
- Base: `origin/main` after PR #20 (`271cb65`)
- Branch: `feature/local-live-order-tracking`
- Rollback checkpoint: `checkpoint/live-order-tracking-2026-08-20`
- Created: 2026-08-20
- Last updated: 2026-08-20

## Request

Poll order status on confirmation (~15s) so Chef updates appear without reload.

## Captain decisions

| Topic | Decision |
|-------|----------|
| Poll interval | **15s** (same as list) |
| Chef auto-refresh | **No** in this slice |
| Tracker | Five steps already shipped (Slice 5) |

## Scope

- Confirmation page React Query + 15s refetch while active
- Sync detail → list cache
- Live E2E without customer reload
- Skill + docs + evidence
- Auth hydrate fix so `/orders/:id` refresh stays logged in

## Acceptance criteria

- [x] Confirmation polls ~15s while active; stops on COMPLETED/CANCELLED
- [x] Orders list continues to poll with tracker
- [x] Chef change appears without customer reload
- [x] Live E2E green (`aria-current` → Preparing within ~15s)
- [x] Frontend tsc green
- [x] Evidence + docs updated

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-08-20
- **Defaults accepted:** 15s interval; no Chef-side auto-refresh
