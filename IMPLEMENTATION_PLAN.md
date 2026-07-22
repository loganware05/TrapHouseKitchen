# Implementation Plan

## Metadata

- Status: **APPROVED**
- Plan ID: `fix-render-api-build-ts-2026-07-22`
- Issue: `local/prelaunch-stripe-regression` (blocker remediation)
- Branch: `fix/local-render-api-build-ts`
- Created: 2026-07-22
- Last updated: 2026-07-22
- Approved by: Captain (Logan)
- Approval date: 2026-07-22
- Approved revision: Captain directed push + PR for this fix after confirming DATABASE_URL links match; unblocks pre-launch verification

## Request

Fix Render `traphousekitchen-api` deploy failure `TS5108: Option 'moduleResolution=node10' has been removed`, then open a PR so production can redeploy and `/health` can return 200.

## Problem Statement

API builds fail when TypeScript 7 resolves `"moduleResolution": "node"` to removed `node10`. This blocks production API health and pre-launch verification iteration 3. P1001 DB reachability is a separate ops check (Captain confirmed DATABASE_URL links match).

## Desired Outcome

- Backend builds cleanly on Render with lockfile-pinned TypeScript
- PR merged / deployed; API `/health` returns 200 (Captain confirms)

## Acceptance Criteria

- [x] `module` / `moduleResolution` set to `Node16`
- [x] `typescript` pinned to `5.9.3`; `render.yaml` uses `npm ci`
- [x] Local `tsc` clean; unit tests pass
- [ ] PR opened and mergeable into `main`
- [ ] Deploy succeeds; `/health` → 200 (Captain)

## Non-Goals

- Password reset / payment hardening / iOS landing
- Changing DATABASE_URL values
- Full pre-launch Go verdict (continues after health 200)

## Assumptions

- Captain approval for push+PR constitutes approval of this blocker fix under the active pre-launch workstream.

## Open Questions

None for this slice.

## Current-State Analysis

- `"moduleResolution": "node"` → TS5108 under TypeScript 7
- `npm install` on Render can float away from lockfile intent; `npm ci` preferred

## Proposed Architecture

No runtime architecture change — build/config only.

## Workstreams

1. tsconfig + typescript pin + render.yaml npm ci
2. Push + PR
3. Captain deploy / health confirm → resume verification

## Parallelization Plan

Sequential.

## Files Expected to Change

- `backend/tsconfig.json`
- `backend/package.json` / `package-lock.json` / `package.json.render`
- `render.yaml`
- `docs/deployment/render.md`
- `IMPLEMENTATION_PLAN.md` (this record)

## Testing Strategy

- `npx tsc -p tsconfig.json`
- Unit tests
- Post-deploy: `/health` 200

## Security Review

No secret changes; no auth/payment logic changes.

## Accessibility Review

N/A

## Migration Plan

None.

## Deployment Plan

Merge to `main` → Render builds `traphousekitchen-api` via blueprint/`npm ci`.

## Rollback Plan

Revert merge commit / redeploy previous `main` SHA. Checkpoint before this workstream: `9ba3cca` / tag `checkpoint/prelaunch-stripe-regression-2026-07-22`.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Node16 changes emit | Verified CommonJS emit + unit tests |
| DB still unreachable | Captain already verified URL links; re-check logs if health stays down |

## Autonomy Budget

- Maximum iterations: 1 for this fix PR
- Maximum failed validation cycles: 1
- Maximum elapsed time: 1 hour

## Definition of Done

- PR created
- Captain can merge/deploy
- `/health` 200 confirmation starts verification iteration 3

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-07-22
- **Note:** Explicit instruction to push + open PR for `fix/local-render-api-build-ts` after DATABASE_URL confirmation.
