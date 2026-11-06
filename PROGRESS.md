# Progress

## Current status

**NorthStar:** repeatable campus service night.

Slice **16** **shipped** on `main` via PR [#33](https://github.com/loganware05/TrapHouseKitchen/pull/33) (`a3733be`). Issue [#32](https://github.com/loganware05/TrapHouseKitchen/issues/32) closed. Rollback tag: `checkpoint/release-gaps-2026-11-05`.

**Active plan:** Slice 17 — prove payment safety — **AWAITING APPROVAL** (`slice-17-payment-safety-2026-11-06`).

## Completed

- Slices 1–16 shipped (PRs #15–#33)
- Slice 16: docs reconcile, stop Render seed-on-start, JWT fail-closed, hard `tokenVersion`, late payment success preserves fulfillment, Privacy/Terms contacts, CI isolation fixes, E2E runner pin to ubuntu-24.04

## Next

1. Captain approve Slice 17 (payment race/refund/decline matrix)
2. Confirm production Chef password rotated (ops)
3. Slice 18 — staging rebuild

## Blockers

- Slice 17 not approved yet
- Production Chef credential rotation still ops-owned if not completed after merge/deploy
- Production reset email still needs Resend when ready
