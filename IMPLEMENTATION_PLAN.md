# Implementation Plan — Slice 18: Recreate staging

## Metadata

- Status: **APPROVED — IMPLEMENTING**
- Plan ID: `slice-18-staging-rebuild-2026-11-09`
- NorthStar: campus service night — prove the full path on a non-production stack before live nights
- Depends on: Slice 17 merged (`a195175`) + XRV docs reconcile PR [#37](https://github.com/loganware05/TrapHouseKitchen/pull/37) (`3ba1506`)
- Issue: [#38](https://github.com/loganware05/TrapHouseKitchen/issues/38)
- Base: `origin/main` at `3ba1506`
- Branch: `chore/local-staging-rebuild`
- Rollback checkpoint: `checkpoint/staging-rebuild-2026-11-11` → `3ba1506`
- Created: 2026-11-09
- Last updated: 2026-11-11

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-11-11
- **Captain notes:** PR #37 merged; approve Slice 18 and proceed with development (plan defaults)

## Prior delivery (closed)

| Slice | Scope | Status |
|-------|--------|--------|
| 16 | Release gaps + JWT/seed/payment replay | **Shipped** — PR #33 |
| 17 | Payment safety matrix | **Merged** — PR #35 (`a195175`); ops verify still open |
| 17 XRV | Docs / Pilot A evidence checklist | **Shipped** — PR #37 |

## Desired behavior

1. Dedicated **staging** (API + static web + Postgres), separate from production.
2. Staging uses **Stripe test** keys only, test webhook secret, distinct JWT / VAPID.
3. Documented customer → Chef smoke checklist exists for staging.
4. Ops docs describe create / configure / smoke / tear-down without touching production.
5. Password-reset smoke works on staging via `SHOW_PASSWORD_RESET_LINK=1` + `APP_ENV=staging` while `NODE_ENV=production`.

## Non-goals

- Making Playwright blocking in CI (Slice 19)
- Float→cents money migration
- Capacitor iOS / SMS / production Resend cutover
- Changing production Stripe live keys
- Agent-provisioned Render resources (MCP unauthorized — Captain creates Blueprint)

## Workstreams

| ID | Stream | Status |
|----|--------|--------|
| A | `render.staging.yaml` (`*-staging` DB/API/web) | Done |
| B | Env matrix + staging ops docs | Done |
| C | Smoke checklist + evidence folder | Done |
| D | `APP_ENV=staging` reset-link gate (ADR-009 amend) + tests | Done |
| E | Memory docs / PR | Implementing |

## Validation

- `npm run repo:where-migrate-deploy` includes staging blueprint migrate line
- Auth integration: staging exposes resetUrl; plain production does not
- Docs-only ops path documented; no production `render.yaml` service rename
- Evidence under `.agent/evidence/slice-18-staging-20261111/`

## Rollback

- Revert Slice 18 PR; delete only `*-staging` Render resources if created
- Tag: `checkpoint/staging-rebuild-2026-11-11`
