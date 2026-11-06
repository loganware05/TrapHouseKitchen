# Progress

## Current status

**NorthStar:** repeatable campus service night.

Slice **15** shipped on `main` (PR #31, `f7c4719`).

Slice **16** implemented on `fix/32-release-gaps-hardening` — PR [#33](https://github.com/loganware05/TrapHouseKitchen/pull/33), issue [#32](https://github.com/loganware05/TrapHouseKitchen/issues/32). Rollback: `checkpoint/release-gaps-2026-11-05`.

## Completed

- Slices 1–15 code shipped (PRs #15–#31)
- Slice 15 live push smoke (2026-09-07) documented on closeout branch; reconciled into Slice 16 docs

## In progress (Slice 16)

- Docs reconcile, JWT fail-closed, tokenVersion hard cutover, stop Render seed-on-start, payment finalization replay fix, Privacy/Terms contacts, README
- **Critical:** Production Chef still authenticates with seed default — Captain must rotate password (script provided)

## Next

1. Finish Slice 16 validation + PR
2. Rotate production Chef password (ops)
3. Slice 17 — prove payment safety matrix

## Blockers

- Production Chef credential rotation (ops; Render MCP auth unavailable in this environment)
- Production reset email still needs Resend when ready
