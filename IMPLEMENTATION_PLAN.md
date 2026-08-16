# Implementation Plan

## Metadata

- Status: **APPROVED — LOCALLY VALIDATED** (pending Apple Pay device/domain gate + PR merge)
- Plan ID: `feature-apple-pay-first-checkout-2026-08-15`
- Issue: `local/apple-pay-first-checkout` (GitHub CLI authentication unavailable)
- Branch: `feature/local-apple-pay-first-checkout`
- Base: `origin/main` at/after `89ffd94` (PR #13 merged)
- Created: 2026-08-15
- Last updated: 2026-08-15
- Approved by: Captain (Logan)
- Approval date: 2026-08-15
- Approved revision: `feature-apple-pay-first-checkout-2026-08-15` as written
- Rollback checkpoint: `checkpoint/apple-pay-first-checkout-2026-08-15`

## Request

Redesign Traphouse Kitchen checkout so Apple Pay is the primary/default payment experience, while preserving a cohesive fallback for card and other eligible Stripe payment methods. After this feature is complete, process the Captain’s later change list sequentially with appropriate E2E regression gates between changes.

## Important Product Constraint

“Apple Pay as default” means:

- Apple Pay is the first, most prominent full-width option whenever Stripe reports it eligible.
- Apple Pay is requested with `paymentMethods.applePay: "always"` and ordered first in Stripe’s Express Checkout Element.
- Apple Pay **cannot** be displayed or selected on unsupported devices, browsers, currencies, accounts, or unregistered domains. On those clients, checkout falls back cleanly to the Payment Element.

## Problem Statement

The current checkout renders only Stripe’s Payment Element after the customer clicks Pay. Wallets are configured as `auto`, but Apple Pay is not presented as a distinct primary action and its placement remains opaque. The flow also needs explicit browser/device/domain validation because Apple Pay availability cannot be proven by ordinary Chromium E2E alone.

PR #13 resolved publishable-key drift by loading the key from `/api/payment/config`; this feature must preserve that alignment.

## Desired Outcome

1. Review order/tip/coupon first, then continue to a payment surface.
2. Eligible customers see a prominent Apple Pay button before all fallback methods.
3. A clear “or pay another way” divider separates Apple Pay/express wallets from cards and other Stripe methods.
4. Unsupported clients never see a broken or empty wallet section.
5. Existing success, decline, webhook, amount, coupon, and Chef-order behavior remains intact.
6. Checkout remains mobile-first and WCAG 2.1 AA.

## Acceptance Criteria

### UX / UI

- [x] Rename the initial action to “Continue to payment · $X.XX” (or equivalent review-first copy).
- [x] Render Stripe `ExpressCheckoutElement` above the Payment Element after the PaymentIntent exists.
- [x] Request Apple Pay as `always` and first in wallet ordering; use a full-width black Apple Pay button with at least a 48px touch target.
- [x] Show the express section only when `onReady` reports at least one available method.
- [x] Show “or pay another way” only when both express and fallback sections are available.
- [x] Preserve cards and other dynamically eligible Stripe methods in the Payment Element.
- [x] Show useful loading, unavailable, cancellation, and confirmation-error states.
- [x] Prevent duplicate confirmation, duplicate order, and double-submit behavior.
- [x] Keep the sheet usable at 375px width without horizontal overflow.

### Payment correctness

- [x] Express checkout confirms the same PaymentIntent/client secret as fallback checkout.
- [x] Apple Pay success calls the same success handler as card payment and clears/navigates once.
- [x] Tip, coupon, subtotal, and final Stripe amount remain consistent.
- [x] No `payment_method_types` restriction is added to PaymentIntent creation; Stripe dynamic payment methods remain enabled.
- [x] `/api/payment/config` key alignment remains the source for Stripe.js initialization.
- [x] Existing card success and decline behavior remains functional.

### Apple Pay operations

- [ ] `traphousekitchen-web.onrender.com` is registered under Stripe Payment Method Domains in the active sandbox and live mode.
- [ ] Apple Pay is enabled in the active Stripe payment-method configuration.
- [ ] Sandbox validation uses HTTPS, a supported Apple device/browser, and an Apple Wallet.
- [ ] Live-mode domain registration is verified before accepting real Apple Pay payments.

### Accessibility

- [x] Wallet and fallback areas have clear headings/status text for screen readers.
- [x] Loading/error messages use appropriate live regions.
- [x] Focus order remains logical; fallback remains keyboard operable.
- [x] Contrast and touch targets meet WCAG 2.1 AA expectations.

## Non-Goals

- Migrating the backend from PaymentIntents to Checkout Sessions in this slice.
- Native iOS/Capacitor Apple Pay integration or Apple merchant entitlements.
- Removing card or other eligible fallback methods.
- Permanently changing production between Stripe test and live keys.
- Implementing the Captain’s future change list before this feature passes its gate.
- Refactoring unrelated checkout, order, coupon, or webhook behavior.

## Assumptions

- The current PaymentIntent architecture remains the safest small change.
- Existing Stripe React/JS packages support `ExpressCheckoutElement`; upgrade only if compilation or documented APIs require it.
- Sandbox and live key pairs remain aligned through `/api/payment/config`.
- Stripe controls final method eligibility even when Apple Pay is requested as `always`.
- Actual Apple Pay wallet confirmation requires Captain-assisted validation on a compatible Apple device.

## Open Questions Resolved by Defaults

- **Fallback methods:** Keep cards and other Stripe-eligible methods.
- **Other wallets:** Allow Stripe-eligible wallets, but order Apple Pay first.
- **Visual style:** Full-width black Apple Pay button, compact divider, existing Traphouse Kitchen styling for fallback.
- **Scope:** Web/PWA checkout only; native Apple Pay is deferred to the Capacitor plan.

## Current-State Analysis

| Area | Current state | Planned change |
|------|---------------|----------------|
| Checkout container | Mobile bottom sheet | Preserve |
| Payment creation | One PaymentIntent via `/orders/checkout` | Preserve |
| Wallet UI | Payment Element wallets `auto` | Add Express Checkout Element first |
| Card fallback | Payment Element | Preserve below divider |
| Stripe key loading | Runtime `/payment/config` with fallback | Preserve |
| Confirmation | `elements.submit()` + `stripe.confirmPayment()` | Share safe confirmation path |
| E2E | Card success + decline | Preserve and add wallet/fallback coverage |

## Proposed Architecture

```text
CheckoutSheet
  ├─ order / tip / coupon review
  └─ Elements (one clientSecret)
       └─ PaymentOptions
            ├─ ExpressCheckoutElement
            │    └─ Apple Pay first when eligible
            ├─ “or pay another way”
            └─ PaymentElement + card submit button

Both confirmation paths
  → stripe.confirmPayment(elements)
  → one shared onSuccess()
  → webhook remains payment source of truth
```

## Workstreams

### W1 — Checkout component design

- Extract/refactor the payment area into a focused component if needed.
- Add Express Checkout Element availability state and confirmation.
- Preserve Payment Element fallback and current error handling.

### W2 — Stripe and operations configuration

- Confirm dynamic payment methods and Apple Pay eligibility requirements.
- Document sandbox/live domain registration and supported-device checklist.
- Do not expose or persist secret keys.

### W3 — Automated tests

- Update payment E2E selectors/copy.
- Retain test-card success and decline coverage.
- Add unsupported-wallet fallback coverage in Chromium.
- Add duplicate-submit/order regression coverage if practical within existing harness.

### W4 — Browser, accessibility, and device validation

- Capture mobile and desktop screenshots.
- Check keyboard/focus/error states.
- Perform Safari/WebKit fallback checks.
- Captain-assisted Apple Pay button + sandbox confirmation on a compatible Apple device.

### W5 — Documentation and PR

- Update `TESTING.md`, `PROGRESS.md`, `STATUS.md`, and Stripe go-live/domain instructions.
- Perform adversarial, security, and accessibility reviews.
- Prepare PR with evidence and rollback instructions.

## Sequential Change Policy After This Feature

For the Captain’s later list:

1. Triage dependencies and order changes.
2. Give each behavioral change an approved plan or an explicitly approved batch.
3. Implement one cohesive slice at a time.
4. Run targeted tests plus the core customer/Chef/payment smoke gate after every slice.
5. Stop on regression before starting the next slice.
6. Keep PRs small enough to review and roll back independently.

## Files Expected to Change

- `frontend/src/components/CheckoutSheet.tsx`
- `frontend/src/components/PaymentForm.tsx`
- New focused wallet/payment component(s), if extraction improves clarity
- `e2e/payment-flow.spec.ts`
- Possibly `frontend/package.json` / lockfile only if Stripe SDK upgrade is required
- `docs/deployment/go-live.md` and/or `docs/deployment/DEPLOYMENT_ENV_VARS.md`
- `TESTING.md`, `PROGRESS.md`, `STATUS.md`, `IMPLEMENTATION_PLAN.md`
- `.agent/evidence/…` for validation reports and screenshots

Backend product files are not expected to change unless implementation discovery finds a required confirmation contract change. Any material backend expansion returns to the approval gate.

## Testing Strategy

| Layer | Validation |
|-------|------------|
| Static | Frontend TypeScript + production build |
| Backend regression | Existing backend `test:all` |
| E2E fallback | Card success, declined card, cart retained |
| E2E wallet eligibility | Chromium confirms fallback; wallet section hides safely when unavailable |
| Mobile | iPhone viewport layout, touch targets, no overflow |
| Accessibility | Keyboard, focus, status/error announcements, contrast |
| Apple Pay real eligibility | Registered HTTPS sandbox domain + compatible Apple device/browser |
| Production smoke | Web/API health, `/payment/config` aligned, sandbox payment before live |

### E2E Limitation

Playwright Chromium/WebKit cannot complete a real Apple Pay wallet/biometric confirmation in CI. Automated tests will validate integration state and fallbacks; actual Apple Pay appearance and payment require device-based sandbox evidence.

## Security Review

- Card/wallet details stay inside Stripe Elements.
- Secret keys never enter frontend bundles, logs, screenshots, or evidence.
- Publishable/secret account and mode alignment remains enforced.
- Webhook signature validation remains authoritative.
- No production charge without explicit Captain approval.
- Review dependency changes if Stripe packages are upgraded.

## Accessibility Review

Run the workspace accessibility review for:

- focus and keyboard order,
- live loading/error announcements,
- express/fallback divider semantics,
- touch targets and mobile zoom,
- visual contrast and reduced-motion behavior.

## Migration Plan

No database migration.

## Deployment Plan

1. Merge approved PR to `main`.
2. Render rebuilds the static web service.
3. Verify API/web health and `/api/payment/config` alignment.
4. Register/confirm the Render web domain in the Stripe sandbox.
5. Run sandbox fallback + Apple Pay device checks.
6. Register/confirm domain in live mode before real transactions.

## Rollback Plan

- Revert the feature PR and redeploy the previous frontend bundle.
- PaymentIntent/backend schema remains unchanged.
- Card fallback from the prior Payment Element implementation is the rollback target.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Apple Pay unavailable on test client | Eligibility-aware UI + supported-device manual gate |
| Domain not registered in correct mode | Separate sandbox/live checklist |
| Duplicate orders when changing methods | One PaymentIntent per checkout + submit lock + E2E |
| Wallet/fallback confirmations diverge | Shared success/error behavior |
| Existing card flow regresses | Preserve card E2E success/decline tests |
| UI becomes crowded on mobile | One-column wallet layout + screenshots at 375px |
| Scope expands into native iOS | Explicit non-goal; separate Capacitor plan |

## Autonomy Budget

- Maximum implementation iterations: 2
- Maximum failed validation cycles: 2
- Maximum elapsed time: 1 working day after approval, excluding Captain device testing
- Maximum external cost: no live charge; sandbox only

## Definition of Done

- Acceptance criteria satisfied or explicitly blocked with evidence.
- Static/build/backend/E2E tests recorded.
- Browser screenshots captured.
- Security, accessibility, and adversarial reviews completed.
- Apple Pay sandbox device evidence captured with Captain assistance.
- Memory docs and rollback notes updated.
- PR opened; no automatic merge or production live charge.

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-08-15
- **Issue:** `local/apple-pay-first-checkout` because GitHub CLI authentication is invalid
- **Captain decision:** Explicit approval in chat to implement the plan as written
