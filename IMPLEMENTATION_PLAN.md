# Implementation Plan

## Metadata

- Status: **APPROVED**
- Plan ID: `fix-stripe-payment-element-sandbox-2026-07-22`
- Issue: `local/prelaunch-stripe-regression` (payment UI blocker)
- Branch: `fix/local-stripe-payment-element-ready`
- Created: 2026-07-22
- Last updated: 2026-07-22
- Approved by: Captain (Logan)
- Approval date: 2026-07-22
- Approved revision: `fix-stripe-payment-element-sandbox-2026-07-22` as written (chat approval)

## Request

1. Fix checkout error: `Invalid value for stripe.confirmPayment(): elements should have a mounted Payment Element or Express Checkout Element.`
2. Align pre-launch payment verification with **Stripe test/sandbox keys** (not live charges).
3. Re-run payment verification with Captain-provided **test** keys (locally; never commit secrets).

## Problem Statement

On checkout, after Pay starts a PaymentIntent, confirming payment fails because Stripe Elements has no mounted/ready Payment Element (Element still loading, remounting after tip/PI refresh, or publishable key mode mismatches the PaymentIntent).

Captain clarified verification should use **Stripe sandbox (test keys)**, not live card charges.

## Desired Outcome

- Checkout Pay only enables after Payment Element `onReady`; call `elements.submit()` before `confirmPayment`.
- Elements remount cleanly when `clientSecret` changes (`key={clientSecret}`).
- Sandbox payment verification succeeds with test keys against local API.
- Docs: pre-launch payment QA = test mode; production keeps live keys for real customers.
- Secrets never committed.

## Acceptance Criteria

- [x] PaymentForm waits for Element ready; submit disabled until ready
- [x] `elements.submit()` then `confirmPayment`
- [x] CheckoutSheet `Elements` keyed by `clientSecret`
- [x] Local sandbox PI confirm evidence (redacted) — `succeeded` in `.agent/evidence/fix-stripe-payment-element-20260722/`
- [x] Memory docs clarify sandbox vs live (`PROJECT_CONTEXT.md`)
- [x] No `sk_` / `pk_` values in git

## Non-Goals

- Permanently switching Render production to test keys
- Feature landing (password reset, hardening, iOS)
- Real money charges

## Assumptions

- Provided keys are Stripe **test** mode; First Mate may use them in local shell env only.
- Production may remain live-keyed for real customers.

## Open Questions

None if approved as written.

## Current-State Analysis

- `CheckoutSheet` → `clientSecret` → `<Elements>` + `<PaymentForm>` / `<PaymentElement>`
- `PaymentForm` confirms without Element ready / `elements.submit()`
- Tip changes replace `clientSecret` → remount races
- pk/sk mode mismatch also prevents Element mount

## Proposed Architecture

Frontend Payment Element lifecycle hardening only. Verification: local backend + Stripe test API.

## Workstreams

1. Fix `PaymentForm.tsx` + `CheckoutSheet.tsx`
2. Sandbox verification (env-injected test keys)
3. Docs update

## Parallelization Plan

Sequential.

## Files Expected to Change

- `frontend/src/components/PaymentForm.tsx`
- `frontend/src/components/CheckoutSheet.tsx`
- Memory docs + redacted evidence
- `IMPLEMENTATION_PLAN.md`

## Testing Strategy

- Local checkout with test card `4242…` after fix
- API confirm with `pm_card_visa` using test secret
- No production live charge

## Security Review

- Do not commit keys; suggest rotate after chat paste
- Evidence: PI id + status + amount only

## Accessibility Review

- Clear disabled Pay state while Element loads

## Migration Plan

None.

## Deployment Plan

PR → main → Render frontend rebuild.

## Rollback Plan

Revert merge.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Keys in chat | Don’t commit; suggest rotate |
| Prod live keys | Sandbox verify locally |

## Autonomy Budget

- Max iterations: 2
- Max failed validation: 2
- Elapsed: 2 hours

## Definition of Done

Fix + sandbox evidence + docs; PR-ready.

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-07-22
- **Note:** Explicit chat approval to implement Payment Element fix + local sandbox verification with provided test keys.
