# Slice 20 — Service operations validation

**Date:** 2026-11-16  
**Issue:** #46  
**Checkpoint:** `checkpoint/slice-20-service-ops-2026-11-16` → `b72cc4e`

## Coverage

- `KitchenOps` singleton + `Dish.remainingServings` migration
- Public `GET /api/kitchen/status`; Chef `GET/PATCH /api/kitchen/ops`
- Checkout/PaymentIntent gated by pause / hours / capacity
- Payment finalize decrements remaining servings → `UNAVAILABLE` at 0
- Chef Dashboard Service night panel; Menu remaining servings; customer banner + checkout disable

## Local tests

```
npx vitest run tests/unit/kitchenOps.test.ts tests/unit/payment.service.test.ts tests/integration/kitchen-ops.test.ts
→ 20 passed
```

## Security follow-up

- `assertRemainingServingsForItems` runs at unpaid order create **and** PaymentIntent create (closes unpaid-draft oversell window).
- Finalize decrement clamps to 0 + UNAVAILABLE under row lock if a concurrent pay already exhausted stock (does not roll back captured payment).

## Rollback

Tag `checkpoint/slice-20-service-ops-2026-11-16`; revert PR / drop migration forward-fix if needed.
