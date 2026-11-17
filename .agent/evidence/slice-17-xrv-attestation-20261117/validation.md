# Slice 17 — XRV deploy attestation (2026-11-17)

Closes checklist row #8 of `.agent/evidence/slice-17-xrv-pilot-a-20261111/validation.md` as far as the repo and public evidence allow.

Render MCP is **unauthorized** in this session, so the dashboard deploy SHA could **not** be read directly. This attestation is **inferred**, not a dashboard read. The inference chain is below; each link is checkable.

## Inference chain

1. **Code ancestry (git):** `a195175` (Slice 17, PR #35) **is an ancestor of** `f5222e4` (Slice 20, PR #47). Verified with `git merge-base --is-ancestor a195175 f5222e4`.
2. **Production runs Slice 20 code:** `GET https://traphousekitchen-api.onrender.com/api/kitchen/status` → **200** (route exists only from `f5222e4` onward). Probe 2026-11-17T22:43Z; artifacts `prod-kitchen-status.txt`, `prod-health.txt`.
3. **Staging runs Slice 20 code:** same route on `traphousekitchen-api-staging` → **200**. Artifacts `staging-kitchen-status.txt`, `staging-health.txt`.
4. **Migration applied:** that route upserts the `KitchenOps` row, so the table from migration `20261116200000_kitchen_ops_and_remaining_servings` exists. Both Blueprints run `npx prisma migrate deploy` in `buildCommand` before the build, and Prisma applies migrations in filename order, aborting on failure. `20261109120000_unique_stripe_refund_id` sorts **before** `20261116200000_…` in `backend/prisma/migrations/`, so it was applied too.
5. **Health:** `/health` reports `database: connected` on both.

## Conclusion by checklist row

| Row | Claim | Result |
|-----|-------|--------|
| 8 | Render deployed code including `a195175` + `20261109120000_unique_stripe_refund_id` applied | **PASS (inferred)** on prod and staging; exact deployed SHA not read from dashboard |
| 9 | Staging smoke (Pilot A env) | **PASS (API + browser)** per Slice 18 evidence (`.agent/evidence/slice-18-staging-smoke-20261113/`); no longer BLOCKED |
| 10 | Operationally verified for Pilot A | **PARTIAL** — see gaps |

## Gaps (not claimed)

- **Exact deployed SHA** is not recorded from the Render dashboard. Captain can add it by pasting the commit shown on the latest deploy of `traphousekitchen-api` (expected `f5222e4` or later).
- **Slice 17 race/refund behaviors have not been exercised on a live environment.** Duplicate webhook replay, sticky refund, and out-of-order events are covered by CI integration tests only (`backend/tests/integration/webhook-stripe.test.ts`). Slice 18 staging smoke covered success, decline, and the Chef pipeline, not these.
- **Unique-index existence** on `Transaction.stripeRefundId` was not queried directly (read-only DB query tool unauthorized).
- **Live Stripe path** remains unverified on production, deliberately; no live-key actions taken.

## Recommendation

Mark row #8 attested (inferred), row #9 PASS, and keep row #10 PARTIAL. Do **not** label Slice 17 "operationally verified" for the XRV Experience Evidence Record until the Captain either (a) confirms the dashboard SHA and (b) approves a staging webhook-replay and refund check, or (c) explicitly accepts the CI-only coverage for those behaviors.
