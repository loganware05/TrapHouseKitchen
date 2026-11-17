# Implementation Plan — Slice 20: Service operations

## Metadata

- Status: **APPROVED — IMPLEMENTING**
- Plan ID: `slice-20-service-ops-2026-11-16`
- NorthStar: campus service night — Chef can open/pause the kitchen, bound hours, cap load, and sell out dishes without taking orders into a closed kitchen
- Depends on: Slice 19 closed (`b72cc4e`)
- Issue: [#46](https://github.com/loganware05/TrapHouseKitchen/issues/46)
- Base: `origin/main` at `b72cc4e`
- Branch: `feature/local-slice-20-service-ops`
- Rollback checkpoint: `checkpoint/slice-20-service-ops-2026-11-16` → `b72cc4e`
- Created: 2026-11-16
- Last updated: 2026-11-16

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-11-16
- **Captain notes:** approve (plan defaults)

## Desired behavior

1. Pause via `acceptingOrders`
2. Optional weekly hours (`America/Chicago`) when `scheduleEnabled`
3. Concurrent kitchen order cap (`null` = unlimited)
4. `Dish.remainingServings` decremented on payment finalize; 0 → `UNAVAILABLE`
5. Public kitchen status + Chef/customer UI

## Non-goals

Delivery ETA, Resend/SMS, Capacitor, XRV attestation, float→cents, non-core E2E expansion.

## Workstreams

| ID | Stream | Status |
|----|--------|--------|
| A | Prisma migration | Done |
| B | Kitchen APIs + checkout enforcement | Done |
| C | Payment-finalize inventory | Done |
| D | Chef UI | Done |
| E | Customer UI | Done |
| F | Tests / evidence / PR | Implementing |

## Rollback

- Tag: `checkpoint/slice-20-service-ops-2026-11-16`
- Revert PR / migrate down
