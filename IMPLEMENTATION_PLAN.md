# Implementation Plan

## Metadata

- Status: **APPROVED**
- Plan ID: `fix-stripe-pk-sk-mismatch-2026-08-04`
- Issue: `local/prelaunch-stripe-regression` (Stripe key mismatch)
- Branch: `fix/local-stripe-publishable-from-api`
- Created: 2026-08-04
- Last updated: 2026-08-04
- Approved by: Captain (Logan)
- Approval date: 2026-08-04
- Approved revision: Captain directed to address client_secret / account mismatch after PR #12 merge

## Request

Fix production error: `The client_secret provided does not match any associated PaymentIntent on this account…` and recheck application status.

## Problem Statement

Evidence from production (2026-08-04):
- Frontend static bundle embeds **`pk_live_…`**
- API `GET /api/payment/config` returns **`pk_test_…`** (backend creates PIs with matching test secret)

Elements initialized with live pk cannot confirm a test-mode PaymentIntent.

## Desired Outcome

- Frontend loads publishable key from `GET /api/payment/config` (same source as backend), with Vite env as fallback only.
- Backend warns/logs if `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` modes differ.
- Status recheck recorded; Captain given Render checklist to keep keys aligned.

## Acceptance Criteria

- [x] Frontend Stripe init uses `/payment/config` publishable key
- [x] Backend mode mismatch log when sk_/pk_ prefixes disagree
- [x] Prod/local health recheck documented
- [x] No secrets committed

## Non-Goals

- Switching production permanently to live or test (Captain chooses env values)
- Other prelaunch feature landing

## Current-State Analysis

Vite `VITE_STRIPE_PUBLISHABLE_KEY` is build-time; Render static site can drift from API dashboard secrets after env changes without rebuild. API already exposes publishable key via `/api/payment/config`.

## Proposed Architecture

```text
CheckoutSheet → getStripePromise() → GET /api/payment/config → loadStripe(pk)
Backend creates PI with STRIPE_SECRET_KEY (same account/mode as STRIPE_PUBLISHABLE_KEY)
```

## Files Expected to Change

- `frontend/src/lib/stripe.ts`
- `frontend/src/components/CheckoutSheet.tsx` (and any other `stripePromise` imports)
- `backend/src/lib/stripe.ts` or `app.ts` boot check
- Evidence + STATUS/PROGRESS

## Testing Strategy

- Unit/typecheck frontend
- Manual: config endpoint returns pk; Elements uses it
- Status smoke: health, dishes, web, payment/config mode

## Security Review

- Publishable keys are public by design; do not log secret keys
- Ensure config endpoint never returns secret key

## Rollback Plan

Revert PR; temporarily align Render `VITE_STRIPE_*` + clear-cache redeploy.

## Approval Record

- Approved via Captain request to address the mismatch after PR #12.
