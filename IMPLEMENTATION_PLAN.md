# Implementation Plan — Slice 19: Decisive CI / Playwright ≥1.61

## Metadata

- Status: **APPROVED — IMPLEMENTING** (local core E2E green; PR pending)
- Plan ID: `slice-19-decisive-ci-2026-11-13`
- NorthStar: campus service night — CI must fail when the core pay/fulfill path regressions
- Depends on: Slice 18 closed (PR #41 / `9ac0008`)
- Issue: [#42](https://github.com/loganware05/TrapHouseKitchen/issues/42)
- Base: `origin/main` at `9ac0008`
- Branch: `chore/local-slice-19-decisive-ci`
- Rollback checkpoint: `checkpoint/slice-19-decisive-ci-2026-11-13` → `9ac0008`
- Created: 2026-11-13
- Last updated: 2026-11-13

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-11-13
- **Captain notes:** Merged PR #41; approve Slice 19 and proceed

## Prior delivery (closed)

| Slice | Scope | Status |
|-------|--------|--------|
| 18 | Staging Blueprint + smoke | **Shipped** — PR #39 + #40; closeout #41 (`9ac0008`) |

## Desired behavior

1. CI **fails the PR** when the **core** Playwright suite fails (no `continue-on-error` on that job).
2. Playwright **1.65.x** installed; Chromium (+ WebKit for mobile) installs on **`ubuntu-latest`**.
3. Non-core / historically red specs remain in-repo and runnable locally, but **do not** block merge.
4. Payment E2E runs in CI only when real Stripe **test** secrets are present and `PLAYWRIGHT_PAYMENT_TESTS=1`; otherwise those tests stay skipped (existing gate), not red.

## Non-goals

- Staging/production deploy changes
- Fixing every non-core flaky spec in this slice
- Float→cents, Capacitor, Resend, service-hours product work
- Changing Vitest unit/integration jobs beyond what E2E seed/CI needs

## Workstreams

| ID | Stream | Status |
|----|--------|--------|
| A | Playwright 1.65.1 + lockfile; CI `ubuntu-latest` | Done |
| B | `@core` tags + `test:e2e:core`; CI runs core only, blocking | Done |
| C | Fix failing core specs / seed / webServer env | Done |
| D | Payment: `PLAYWRIGHT_PAYMENT_TESTS=1` in CI only when test secrets are real | Done |
| E | Memory + evidence + PR | Implementing |

## Validation

- Local or CI: `npm run test:e2e:core` green
- PR checks: Vitest green; Playwright E2E required and green without `continue-on-error`
- Evidence under `.agent/evidence/slice-19-decisive-ci-20261113/`
- Rollback: revert PR / reset to checkpoint tag

## Rollback

- Tag: `checkpoint/slice-19-decisive-ci-2026-11-13`
- Revert Slice 19 PR (restores non-blocking E2E + older Playwright)
