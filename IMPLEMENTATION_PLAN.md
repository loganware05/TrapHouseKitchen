# Implementation Plan — Slice 18: Recreate staging

## Metadata

- Status: **AWAITING APPROVAL**
- Plan ID: `slice-18-staging-rebuild-2026-11-09`
- NorthStar: campus service night — prove the full path on a non-production stack before live nights
- Depends on: Slice 17 **SHIPPED** — PR [#35](https://github.com/loganware05/TrapHouseKitchen/pull/35) merged (`a195175` on `main`)
- Issue: `local/slice-18-staging-rebuild` (placeholder until created after approval)
- Base: `origin/main` at `a195175`
- Proposed branch: `chore/local-staging-rebuild`
- Rollback checkpoint: to be tagged after approval
- Created: 2026-11-09
- Last updated: 2026-11-09

## Prior delivery (closed)

| Slice | Scope | Status |
|-------|--------|--------|
| 16 | Release gaps + JWT/seed/payment replay | **Shipped** — PR #33 |
| 17 | Payment safety matrix (races, refunds sticky) | **Shipped** — PR #35 |

## Desired behavior

1. A dedicated **staging** environment exists (API + static web + Postgres), separate from production.
2. Staging uses **Stripe test** keys only (`sk_test_` / `pk_test_`), test webhook secret, and non-prod JWT / VAPID / email settings.
3. A documented, repeatable **customer → Chef smoke** checklist passes on staging (browse, checkout, pay test card, Chef advance, push/email as configured).
4. Ops docs (`docs/deployment/`) describe how to create, configure, smoke, and tear down staging without touching production.

## Non-goals

- Making Playwright blocking in CI (Slice 19)
- Float→cents money migration
- Capacitor iOS / SMS / production Resend cutover
- Changing production Stripe live keys

## Workstreams (proposed)

| ID | Stream | Notes |
|----|--------|-------|
| A | Render staging blueprint or second Blueprint/services | Separate DB; `NODE_ENV=production` OK with test Stripe; distinct service names |
| B | Env matrix | Document required vars; never reuse live Stripe/webhook secrets |
| C | Smoke checklist | Extend go-live / QA with staging-specific commands + evidence folder |
| D | Optional preview alias | Custom staging hostname if Captain wants |

## Open questions (Captain)

1. Prefer **second Render Blueprint** (staging API/web/DB) or a single Blueprint with staging services named `*-staging`?
2. Staging frontend URL preference (e.g. `traphousekitchen-web-staging.onrender.com`)?
3. Is Resend required on staging, or is `SHOW_PASSWORD_RESET_LINK=1` enough for auth smoke?

## Assumptions (if Captain only says “approve”)

- Second set of Render services + managed Postgres named `*-staging`
- Stripe **test** mode only
- Password-reset smoke via `SHOW_PASSWORD_RESET_LINK=1` (no Resend required)
- Docs + checklist in-repo; Captain creates Render resources (or approves agent using Render MCP if auth available)

## Validation

- Staging `/health` OK with DB
- Test-card checkout succeeds; Chef sees one paid order; status advances
- Evidence under `.agent/evidence/slice-18-staging-*/`
- Confirm production unchanged

## Approval Record

- **Status:** AWAITING APPROVAL
- **Approved by:** —
- **Approval date:** —
- **Captain notes:** —

Implementation of staging infra / product files will not begin until this plan is explicitly approved.
