# Slice 3 validation — unpaid order visibility

**Date:** 2026-08-17  
**Branch:** `fix/local-unpaid-order-visibility`  
**Checkpoint:** `checkpoint/unpaid-order-visibility-2026-08-17` (`0b81dce`)

## Changes

- Customer + chef list queries exclude `UNPAID`, `PENDING`, `FAILED` payment statuses
- Single-order GET unchanged (checkout/confirmation still works)
- `payment_intent.canceled` webhook sets order `CANCELLED` when not paid
- Abandoned-order cleanup job on API start (30 min threshold, 5 min sweep)

## Backend tests

```
npm run test:all — 55/55 passed
```

Integration file: `backend/tests/integration/unpaid-order-visibility.test.ts` — 6/6 passed

## Script

```
npx tsx backend/scripts/test-order-filter.ts — ALL TESTS PASSED
```

## E2E

- `e2e/payment-flow.spec.ts` — not re-run this session (no change to checkout sheet decline behavior); prior Slice 2 run 3/3 green

## Skill

- Added `.cursor/skills/checkout-payments/SKILL.md`
