# Implementation Plan — Slice 9: Dynamic ETA + Chef prep intelligence

## Metadata

- Status: **APPROVED**
- Plan ID: `slice-9-dynamic-eta-2026-08-22`
- Parent plan: `post-launch-ux-batch-2026-08-15` (Slices 1–8 complete; PR #23 merged)
- Issue: `local/dynamic-eta`
- Base: `origin/main` after PR #23 (`37a7470`)
- Proposed branch: `feature/local-dynamic-eta`
- Proposed rollback checkpoint: `checkpoint/dynamic-eta-2026-08-22`
- Created: 2026-08-22
- Last updated: 2026-08-22 (Captain follow-up: chef kitchen 15s live poll)

## Request

1. Replace static `15 + itemCount × 5` with a **dynamic ETA** at checkout (dish prep × qty + kitchen queue).
2. **Include READY in queue** with **status-weighted** penalties so a backlog of nearly-finished orders does not inflate new ETAs like orders still cooking (Captain example: 3 READY + 2 PREPARING → new customer should not immediately see a huge wait).
3. Add a **chef intelligence layer**:
   - Edit **per-order** projected wait time on active orders.
   - **Learning orchestrator** (live-gated): after enough completed orders, adjust projections using trend data (actual vs projected at completion).
4. Run full automated validation **before** enabling learning in production.

## Captain decisions (2026-08-22)

| Topic | Decision |
|-------|----------|
| Base dynamic ETA | Approved |
| READY in queue | **Yes** — include with **lower weight** than PENDING/PREPARING |
| Chef per-order override | **Yes** |
| Learning from completed orders | **Yes** — applies when live + sufficient samples; tested offline first |
| Live activation | Feature-flag / env gate; disabled in dev/test by default |

## Current behavior

| Area | Today |
|------|--------|
| Formula | `15 + itemCount × 5` (`backend/src/lib/stripe.ts`) |
| When computed | PaymentIntent creation only |
| Persisted | `Order.prepTime` snapshot |
| `Dish.prepTime` | On menu, unused in ETA |
| Chef | No per-order wait edit; no trend feedback |
| Learning | None |

## Phased delivery (single PR, three phases)

### Phase 9A — Dynamic ETA engine (customer checkout)

**Queue statuses counted (paid, not archived, excluding current order):**

| Status | Queue weight (default) | Rationale |
|--------|------------------------|-----------|
| PENDING | 8 min | Not started |
| PREPARING | 8 min | Active cook load |
| READY | 2 min | Included in queue; minimal extra wait (Captain) |
| OUT_FOR_DELIVERY | 0 | Handed off |

```
dishMinutes = Σ (effectiveDishPrep(dish) × quantity)
queueMinutes = pending×8 + preparing×8 + ready×2
prepTime = clamp(BASE_BUFFER + dishMinutes + queueMinutes + learningBias, MIN_ETA, MAX_ETA)
```

| Constant | Default |
|----------|---------|
| `DEFAULT_DISH_PREP` | 15 |
| `BASE_BUFFER` | 5 |
| `MIN_ETA` | 15 |
| `MAX_ETA` | 120 |
| `learningBias` | 0 until Phase 9C enabled + samples met |

`effectiveDishPrep(dish)` uses calibrated per-dish value when learning has produced one (Phase 9C); else `dish.prepTime ?? DEFAULT_DISH_PREP`.

**Example (Captain scenario):** 3 READY + 2 PREPARING ahead → queue = 3×2 + 2×8 = **22 min** (vs 5×8 = 40 if flat). One burger (15 min dish) → ~42 min total before cap; mostly from PREPARING, not READY pile.

Persist on `Order.prepTime` at payment; customer UI unchanged (confirmation / Orders / emails).

---

### Phase 9B — Chef prep orchestration (manual + visibility)

**Per-order override**

- Chef can set/update `prepTime` on active orders (PENDING → OUT_FOR_DELIVERY).
- API: `PATCH /api/orders/:id/prep-time` (chef only), body `{ prepTimeMinutes: number }`.
- Optional audit fields (additive migration): `prepTimeSource` (`AUTO` | `CHEF_OVERRIDE`), `prepTimeUpdatedAt`.
- Customer-facing countdown uses updated value on next poll (15s) — improves trust without websockets.

**Chef UI (ChefOrdersPage + optional dashboard snippet)**

- Show current **projected ready** time per active order.
- Inline control: adjust minutes (+/− or number input) + Save.
- **Queue summary:** counts by status + estimated queue load minutes (transparency for the orchestrator role).
- **Live poll (Captain follow-up 2026-08-22):** Chef Orders + Dashboard refresh `allOrders` and `prep-intelligence` every **15s** (`CHEF_KITCHEN_POLL_MS`, same as customer status poll) so queue counts and order statuses stay current without reload.

**Non-goals for 9B:** Do not auto-change status from override alone.

---

### Phase 9C — Learning orchestrator (live-gated)

**Purpose:** After consistent live traffic, make projections track kitchen reality using completed-order history.

**Observation (on transition to COMPLETED):**

- `projectedPrepMinutes` = `order.prepTime` at placement (or last chef override if flagged).
- `actualPrepMinutes` = minutes from `createdAt` (or `paidAt` if we add it later) to `completedAt`.
- `deltaMinutes` = `actualPrepMinutes - projectedPrepMinutes`.

Store observations in additive table `PrepTimeObservation` (orderId, dishIds, projected, actual, delta, statusAtComplete, createdAt) — no PII beyond order ref.

**Calibration (batch / on each COMPLETED when enabled):**

- Rolling window: last **N** completed PAID orders (default N=30, min N=20 to apply).
- `globalBiasMinutes` = rounded median of `deltaMinutes` (clamp e.g. −15..+30).
- Per-dish: for dishes with ≥ **M** observations (default M=5), median delta → suggested `Dish.prepTime` adjustment (chef can accept via existing menu edit or auto-apply only when `PREP_AUTO_APPLY_DISH=1` — **default: suggest only**, show on chef dashboard).

**Activation gates (production):**

| Gate | Default |
|------|---------|
| `PREP_LEARNING_ENABLED` | `false` in all envs until Captain enables on Render |
| Min completed samples | 20 before `globalBiasMinutes` applies |
| Min per-dish samples | 5 before dish suggestion |

**Pre-live testing:** All learning logic unit/integration tested with **seeded synthetic observations** while flag is **off** in production config. CI runs learning tests with flag **on** in test env only.

**Chef dashboard intelligence panel (when samples > 0):**

- “Last 30 orders: median **+X min** vs estimate”
- List dishes with suggested prep time updates (accept → PATCH dish)
- Toggle copy: “Learning active” / “Collecting data (12/20 orders)”

## Schema changes (additive)

| Model / field | Purpose |
|---------------|---------|
| `PrepTimeObservation` | Historical actual vs projected |
| `PrepCalibration` (singleton row) | `globalBiasMinutes`, `sampleCount`, `lastCalculatedAt`, `learningEnabled` mirror |
| `Order.prepTimeSource` | `AUTO` \| `CHEF_OVERRIDE` (optional) |
| `Order.prepTimeUpdatedAt` | Audit (optional) |

No removal of existing fields. Rollback = revert code; tables can remain empty.

## Affected systems

| Area | Phase |
|------|-------|
| `prepTime.service.ts` + unit tests | 9A |
| `payment.service.ts` | 9A |
| Prisma migration | 9C (+ optional 9B audit fields) |
| `order.service.ts` (record observation on COMPLETED) | 9C |
| `PATCH orders/:id/prep-time` | 9B |
| `ChefOrdersPage`, `ChefDashboard` intelligence panel | 9B, 9C |
| `order-lifecycle` skill | All |
| `docs/deployment/DEPLOYMENT_ENV_VARS.md` | `PREP_LEARNING_ENABLED`, optional tuning vars |

## Non-goals

- Real-time ETA recalc on every queue change for existing customers (override + poll is enough)
- External ML / LLM services
- Websockets
- Auto-changing order status from predictions
- iOS / Capacitor

## Validation plan

| Layer | Phase | What |
|-------|-------|------|
| Unit | 9A | Status-weighted queue; READY adds less than PREPARING; caps |
| Unit | 9C | Median bias, min-sample gates, no apply when N < 20 |
| Integration | 9A | Queued orders → higher prepTime on next checkout |
| Integration | 9B | Chef override → customer GET order returns new prepTime |
| Integration | 9C | Seed 25 observations with +10 bias → checkout includes bias when flag on |
| Backend | All | `npm run test:all` |
| Frontend build | 9B | `tsc && vite build` |
| E2E | 9B | Chef adjusts prep → optional confirmation poll (if stable) |
| Evidence | All | `.agent/evidence/dynamic-eta-YYYYMMDD/` |

**Pre-production checklist for learning:**

1. All 9C tests green in CI with `PREP_LEARNING_ENABLED=1` in test only.
2. Production Render: `PREP_LEARNING_ENABLED=0` on deploy.
3. Captain enables after soft-launch volume; monitor dashboard bias panel.

## Rollback

- Checkpoint tag before branch.
- Disable `PREP_LEARNING_ENABLED` immediately if estimates drift.
- Revert API deploy; chef overrides remain in DB but harmless.

## Autonomy budget

- Max 3 iterations on flaky integration timing tests.
- Stop and report if migration conflicts on Render.

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-08-22
- **Scope:** Phases 9A+9B+9C in one slice (`feature/local-dynamic-eta`)
