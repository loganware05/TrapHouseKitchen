# Slice 17 — XRV / Pilot A evidence checklist

Date: 2026-11-11  
Plan: `slice-17-xrv-reconcile-2026-11-10`  
Issue: [#36](https://github.com/loganware05/TrapHouseKitchen/issues/36)  
Reference thread: `<t3-thread://v2/6f2ef0e3-84db-45f4-b721-1941b59842dd/55ac4d33-7144-4f4a-9eb2-a265698ae5c6>`  
Code baseline: `a195175f6f11bd2c97b9d2189bb315766457a127`  
Rollback (code): `checkpoint/payment-safety-2026-11-06`  
Rollback (docs): `checkpoint/slice-17-xrv-reconcile-2026-11-11`

**Rule:** A merged PR is not proof of production success. Distinguish implemented / merged / tested / deployed / operationally verified.

## Checklist

| # | Claim | Status | Evidence |
|---|-------|--------|----------|
| 1 | Slice 17 implemented on `main` | PASS | `backend/src/services/paymentFinalization.service.ts`; migration `backend/prisma/migrations/20261109120000_unique_stripe_refund_id/` |
| 2 | Merged | PASS | PR [#35](https://github.com/loganware05/TrapHouseKitchen/pull/35) merge SHA `a195175`; issue [#34](https://github.com/loganware05/TrapHouseKitchen/issues/34) closed |
| 3 | CI tested (integration matrix in CI) | PASS | Post-merge main [run 42685302101](https://github.com/loganware05/TrapHouseKitchen/actions/runs/42685302101) SUCCESS; PR head [run 42679402003](https://github.com/loganware05/TrapHouseKitchen/actions/runs/42679402003) SUCCESS on `fae1f46` |
| 4 | Local agent integration | PARTIAL | [`.agent/evidence/slice-17-payment-safety-20261109/validation.md`](../slice-17-payment-safety-20261109/validation.md) — unit 49/49 + build; integration deferred to CI |
| 5 | Payment-safety matrix coverage | PASS (unit/integration) | Concurrent finalize + coupon once; duplicate succeeded; late `payment_failed` after PAID; sticky refund; idempotent `charge.refunded`; decline→retry — `backend/tests/integration/webhook-stripe.test.ts` |
| 6 | E2E race/refund matrix | N/A (Captain optional) | Issue #34: sandbox Playwright optional / not merge blocker; `e2e/payment-flow.spec.ts` covers success + decline only |
| 7 | Production Chef seed password rotated | PASS (ops attested) | Captain attestation 2026-11-11 (this approval turn); no password values stored |
| 8 | Render deployed `a195175` + migration applied | OPEN | No in-repo deploy log; Render MCP unauthorized during discovery — needs Captain/dashboard attestation |
| 9 | Staging smoke (Pilot A env) | BLOCKED | Staging unavailable until Slice 18 |
| 10 | Operationally verified for Pilot A | OPEN | Depends on #8–#9 |

## Payment-safety test inventory (reference)

- `concurrent succeeded finalization creates a single CHARGE and leaves coupon consumed once`
- `payment_intent.succeeded is idempotent on Stripe retries`
- `payment_failed after PAID does not downgrade paymentStatus`
- `payment_intent.succeeded after REFUNDED does not revive order to PAID`
- `charge.refunded is idempotent and marks full refund`
- `decline then succeeded retry marks PAID with a single CHARGE`
- Gap: dedicated arbitrary out-of-order pairs (e.g. refund-before-succeed) not a separate case

## Pilot A next validation steps (ordered)

1. Merge docs reconcile PR for #36 so `STATUS.md` / `PROGRESS.md` on `main` match `a195175`.
2. Captain/ops confirm Render API+web deploy includes `a195175` and `prisma migrate deploy` applied `20261109120000_unique_stripe_refund_id` (unique index on `Transaction.stripeRefundId`).
3. Approve and execute Slice 18 staging rebuild (queued plan).
4. On staging (Stripe **test**): QA_CHECKLIST §1.13–1.17 plus race/refund notes from TESTING Slice 17 — success, decline, duplicate webhook replay, refund sticky, Chef sees one paid order.
5. Only then mark Slice 17 **operationally verified** for XRV Experience Evidence Record.

## Remaining blockers

- Render deploy attestation for `a195175`
- Staging environment (Slice 18)
- Live Stripe path re-verify deferred until staging/pilot env
