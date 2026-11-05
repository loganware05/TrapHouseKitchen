# Implementation Plan — NorthStar: Campus Service Night

## Metadata

- Status: **APPROVED — IMPLEMENTING**
- Plan ID: `northstar-campus-service-night-2026-11-05`
- Source: `TrapHouseKitchen_Repository_State_2026-10-22.pdf` (reviewed `main` at `f7c4719`)
- Issue: [#32](https://github.com/loganware05/TrapHouseKitchen/issues/32)
- Base: `origin/main` at `f7c4719`
- Branch: `fix/32-release-gaps-hardening`
- Rollback checkpoint: `checkpoint/release-gaps-2026-11-05`
- Created: 2026-11-05
- Last updated: 2026-11-05

## NorthStar

**A repeatable, verified campus service night.**

A customer can place and pay for an order, the Chef sees exactly one paid order, fulfillment advances safely, the customer receives updates, and reviews/coupons work without account leaks or payment ambiguity.

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-11-05
- **Captain notes:**
  1. Approve Slice 16 scope as written (docs + seed-off-start + JWT fail-closed + hard tokenVersion + payment finalization + README)
  2. Privacy/Terms: use real contact values (supplied privately for this slice)
  3. Hard `tokenVersion` cutover
  4. Proceed with issue / branch / worktree
  5. Verify any seed-created production Chef account

## Slice 16 scope (active)

| Workstream | Status |
|------------|--------|
| A Docs closeout + PROJECT_CONTEXT refresh | In progress |
| B Stop prod seed-on-start + seed refuse-prod | In progress |
| C JWT fail-closed + tokenVersion hard cutover | In progress |
| D Payment finalization replay fix | In progress |
| E README DX | In progress |
| F Privacy/Terms real contacts | In progress |
| G Production Chef seed-password verification | **CRITICAL finding** — default seed login still succeeds on production API; rotation required via ops script |

## Roadmap (later slices — not approved yet)

17 payment safety matrix → 18 staging → 19 decisive CI → 20 service ops → 21 delivery ETA → 22 engagement → 23 iOS

## Rollback

```bash
git checkout main
git reset --hard checkpoint/release-gaps-2026-11-05
# If merged: revert the Slice 16 PR and redeploy previous Render deploy
```
