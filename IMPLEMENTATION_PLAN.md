# Implementation Plan — Slice 17 XRV status reconcile

## Metadata

- Status: **APPROVED — IMPLEMENTING**
- Plan ID: `slice-17-xrv-reconcile-2026-11-10`
- NorthStar / XRV: release integrity + Experience Evidence Record (TrapHouse companion only)
- Depends on: Slice 17 **MERGED** — PR [#35](https://github.com/loganware05/TrapHouseKitchen/pull/35) (`a195175` on `main`); issue [#34](https://github.com/loganware05/TrapHouseKitchen/issues/34) closed
- Issue: [#36](https://github.com/loganware05/TrapHouseKitchen/issues/36)
- Base: `origin/main` at `a195175`
- Branch: `docs/local-slice-17-xrv-reconcile`
- Rollback checkpoint: `checkpoint/slice-17-xrv-reconcile-2026-11-11` → `a195175`
- Created: 2026-11-10
- Last updated: 2026-11-11

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-11-11
- **Captain notes:** Approve XRV reconcile plan; production Chef password rotated (attested this thread)

## Desired behavior

1. Canonical docs on `main` match merged reality: Slice 17 **implemented + merged + CI-tested**; not claimed as production-operational without evidence.
2. XRV / Pilot A evidence checklist exists under `.agent/evidence/` with explicit state rows (merged vs tested vs deployed vs operationally verified).
3. Chef seed-password rotation recorded as **ops attested** (Captain 2026-11-11).
4. Slice 18 staging rebuild remains **queued** (separate approval) — not started by this change.

## Non-goals

- Product / payment / Stripe / webhook code changes
- `render.yaml` or other deploy config edits
- Claiming production deploy of `a195175` without Render attestation
- Starting Slice 18 infra
- Merging, pushing, or closing issues beyond this docs PR workflow

## Workstreams

| ID | Stream | Status |
|----|--------|--------|
| A | Align STATUS / PROGRESS / CHANGELOG / PROJECT_CONTEXT / TESTING to `a195175` | Implementing |
| B | XRV Pilot A evidence checklist (CI URLs, migration, deploy/ops gaps) | Implementing |
| C | Queue Slice 18 plan text for next approval gate | Implementing |
| D | Docs PR to `main` (#36) | Pending |

## State distinction (Slice 17)

| State | Result | Evidence |
|-------|--------|----------|
| Implemented | Yes | `paymentFinalization.service.ts`, migration `20261109120000_unique_stripe_refund_id` |
| Merged | Yes | PR #35 → `a195175f6f11bd2c97b9d2189bb315766457a127` |
| Tested (CI) | Yes | Main CI [42685302101](https://github.com/loganware05/TrapHouseKitchen/actions/runs/42685302101); PR CI [42679402003](https://github.com/loganware05/TrapHouseKitchen/actions/runs/42679402003) |
| Tested (local agent) | Partial | `.agent/evidence/slice-17-payment-safety-20261109/` — unit PASS; integration deferred to CI |
| Deployed | **Unverified** | No in-repo Render deploy SHA for `a195175` |
| Operationally verified | **No** | Staging absent; live Stripe re-verify open |

**Merged PR ≠ production success.**

## Validation (this change)

- Docs-only diff; no `backend/src` / `frontend/src` / `render.yaml` changes
- STATUS baseline SHA equals `origin/main` HEAD (`a195175`)
- Evidence checklist lists CI run URLs and remaining blockers

## Rollback

- Revert docs PR; product code unchanged
- Code rollback for Slice 17 remains `checkpoint/payment-safety-2026-11-06`

---

# Queued next plan — Slice 18: Recreate staging

## Metadata

- Status: **AWAITING APPROVAL** (queued; not active until Captain approves)
- Plan ID: `slice-18-staging-rebuild-2026-11-09`
- Depends on: Slice 17 merged (`a195175`) + docs reconcile (#36)
- Issue: `local/slice-18-staging-rebuild` (create after approval)
- Proposed branch: `chore/local-staging-rebuild`
- Created: 2026-11-09

## Desired behavior

1. Dedicated **staging** (API + static web + Postgres), separate from production.
2. Stripe **test** keys only; test webhook secret; non-prod JWT / VAPID / email.
3. Documented customer → Chef smoke checklist passes on staging.
4. Ops docs describe create / configure / smoke / tear-down without touching production.

## Non-goals

- Blocking Playwright in CI (Slice 19)
- Float→cents migration
- Capacitor iOS / SMS / production Resend cutover
- Changing production Stripe live keys

## Assumptions (if Captain only says “approve”)

- Second set of Render services + managed Postgres named `*-staging`
- Stripe **test** mode only
- Password-reset smoke via `SHOW_PASSWORD_RESET_LINK=1` (no Resend required)

## Approval Record (Slice 18)

- **Status:** AWAITING APPROVAL
- **Approved by:** —
- **Approval date:** —
- **Captain notes:** —

Staging infra will not begin until this queued plan is explicitly approved.
