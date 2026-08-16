# Implementation Plan

## Metadata

- Status: **APPROVED**
- Plan ID: `post-launch-ux-batch-2026-08-15`
- Issue: `local/post-launch-ux-batch` (GitHub issues per slice created at implementation time)
- Base: `origin/main` after PR #14 (Apple Pay-first checkout) merge
- Created: 2026-08-15
- Last updated: 2026-08-15
- Approved by: Captain (Logan)
- Approval date: 2026-08-15

## Request

Captain provided an 11-item checklist after merging PR #14. Items are to be tackled sequentially, each gated by appropriate E2E tests, and the Captain's Compass system should "train skills" for each task domain (capture reusable procedures under `.cursor/skills/`).

## Captain Decisions (recorded 2026-08-15)

| Question | Decision |
|----------|----------|
| Delivery model | **Delivery only** — every order must select a dorm/location |
| Dorm list | Harvey Hall; Tantum Hall; Bethune Hall; Banneker Hall; Younge Hall; James Hall; Olivia Davidson Hall; Adams Hall; Douglass Hall; White Hall; Rockefeller Hall; Sage Hall; Emery 1 Hall; Emery 2 Hall; Emery 3 Hall; Emery 4 Hall; East (room number required); North (room number required); West (room number required); Marable (room number required) |
| Payment-failure handling | Keep pre-creating orders (needed for PaymentIntent), but **hide unpaid orders** from Chef and customer lists until paid, and **auto-cancel abandoned unpaid orders after ~30 min** |
| Out-for-delivery scope | **All orders** pass through Out for delivery |
| Dish reviews | Keep backend flow; **redesign UX as receipt-style** — recent completed orders shown as receipts with per-dish "leave a review" actions |
| Pull-to-refresh scope | Main customer tabs (Home, Menu, Orders) + Chef dashboard/orders |

## Current-State Findings (from repository discovery)

1. **+ Add behavior:** `MenuPage.tsx` and `DishDetailPage.tsx` call `addItem()` then immediately `openCheckout()` — the checkout sheet opens on every add.
2. **Chef nav bug:** `Layout.tsx` active-state matcher uses `pathname.startsWith(to + '/')`; Dashboard (`/chef`) matches all nested chef routes, so it stays highlighted everywhere.
3. **No location model:** `Order` in `schema.prisma` has no delivery/dorm field; checkout collects none; confirmation page hard-codes a pickup address.
4. **Statuses:** `OrderStatus` = PENDING/PREPARING/READY/COMPLETED/CANCELLED (no OUT_FOR_DELIVERY). Chef advances PENDING→PREPARING→READY→COMPLETED.
5. **Tracking:** `OrderTracker.tsx` exists (Received→Preparing→Ready→Picked up) but the confirmation page fetches once and never refetches; OrdersPage shows a static badge. No polling/websockets.
6. **ETA:** `prepTime = 15 + itemCount * 5` at PaymentIntent creation; `Dish.prepTime` exists but is unused; no order-volume input.
7. **Pull-to-refresh:** none; app is a PWA (VitePWA, autoUpdate).
8. **Cart button:** mobile cart is a floating bottom-right pill that can overlap content (including dish "+ Add" buttons); desktop cart is already in the header.
9. **Reviews:** per-dish reviews tied to eligible (COMPLETED + PAID, ≤30 days) orders already exist with chef approval + $4 coupon; UX starts from a form page, not from order receipts. `OrdersPage` passes a `dishId` URL param the form ignores.
10. **Build my meal:** rendered on `HomePage.tsx` ("Build my meal under" + budget input) opening `AIBuilder`; backend endpoint `/api/ai/build-meal`.
11. **Payment failure:** Order row is created before payment (PENDING/UNPAID). Failed orders vanish from Chef view but remain in customer view; **abandoned PENDING orders remain visible to both**; PaymentIntent cancellation doesn't update the order; no cleanup job.

## Sequenced Slices

Each slice: own branch `feature/local-<slug>` or `fix/local-<slug>`, rollback checkpoint tag, E2E gate (Playwright Chromium + backend `test:all`), evidence under `.agent/evidence/<slug>-<date>/`, then a skill update.

### Slice 1 — Cart & menu UX polish (`fix/local-cart-ux-polish`)

Checklist items: "+ adds to cart instead of opening cart", "move cart button next to profile", "remove Build my meal".

- [x] `MenuPage`/`DishDetailPage`/Home Dish strips: `addItem()` shows toast + cart badge update only; remove `openCheckout()` on Dish adds.
- [x] Move mobile cart button into the top header beside the profile button; remove the floating bottom-right pill so it never blocks "+ Add".
- [x] Cart badge shows item count; opening cart still uses the checkout sheet.
- [x] Remove the "Build my meal under" section and orphaned `AIBuilder` component (leave backend endpoint intact).
- [x] E2E: add-to-cart keeps user on menu; cart opens only from header button; no Build-my-meal section.
- [x] Skill: `.cursor/skills/mobile-ux-patterns` (header actions, floating-element pitfalls).

**Slice 1 execution:** `local/cart-ux-polish`; branch `fix/local-cart-ux-polish`; rollback checkpoint `checkpoint/cart-ux-polish-2026-08-15` (`d54bec0`). Local validation passed; PR preparation pending.

### Slice 2 — Chef nav active-state fix (`fix/local-chef-nav-active`)

- [ ] Exact-match Dashboard (`/chef`) in `Layout.tsx`; prefix-match only for nested routes.
- [ ] E2E: visiting `/chef/orders` highlights Orders only.
- Skill: update `react-engineering` (route active-state matching).

### Slice 3 — Payment-failure hardening (`fix/local-unpaid-order-visibility`)

Checklist item: "Ensure orders aren't placed when payment method fails."

- [ ] Customer + Chef order queries exclude orders with `paymentStatus` UNPAID/PENDING/FAILED (customer may see own order only on the confirmation/tracking screen while payment settles).
- [ ] `payment_intent.canceled` webhook marks the order CANCELLED.
- [ ] Auto-cancel job (interval on API start): unpaid orders older than ~30 min → CANCELLED.
- [ ] Failed payment in checkout sheet leaves the cart intact (already covered by existing E2E; keep green).
- [ ] E2E/integration: failed-payment order never appears in Chef orders; abandoned order auto-cancels.
- Skill: `.cursor/skills/checkout-payments` (PaymentIntent lifecycle, webhook truth, abandoned-order cleanup).

### Slice 4 — Delivery dorm location (`feature/local-dorm-delivery`)

- [ ] Prisma: add `deliveryLocation` (string) to `Order`; migration.
- [ ] Checkout sheet: required dorm/location dropdown using the Captain-approved list before "Continue to payment"; East, North, West, and Marable additionally require a room number.
- [ ] Backend checkout validation requires a known location.
- [ ] Chef orders + customer confirmation show the location; replace the hard-coded pickup address.
- [ ] E2E: checkout blocked without a dorm; location visible on Chef order card.
- Skill: update `postgres-prisma` (additive migration pattern on live data).

### Slice 5 — Order status expansion (`feature/local-out-for-delivery`)

Checklist item: customer statuses placed → preparing → ready → out for delivery → complete (all orders).

- [ ] Prisma enum: add `OUT_FOR_DELIVERY`; migration.
- [ ] Chef flow: READY → OUT_FOR_DELIVERY → COMPLETED buttons; status transition validation server-side.
- [ ] Customer-facing labels: PENDING = "Placed".
- [ ] E2E: chef advances through all five states; customer sees each label.
- Skill: `.cursor/skills/order-lifecycle` (status machine, enum migration).

### Slice 6 — Real order tracking (`feature/local-live-order-tracking`)

- [ ] Extend `OrderTracker` to five steps incl. Out for delivery.
- [ ] Live updates: poll order status (React Query `refetchInterval` ~10–15s) on confirmation page and active orders in OrdersPage; stop polling on COMPLETED/CANCELLED.
- [ ] OrdersPage: active orders show the tracker, not just a badge.
- [ ] E2E: status change by chef reflects on customer screen without manual reload.
- Skill: update `order-lifecycle` (client polling patterns).

### Slice 7 — Pull-to-refresh (`feature/local-pull-to-refresh`)

- [ ] Touch-gesture pull-to-refresh (lightweight custom hook; no heavy dependency) on Home, Menu, Orders, Chef dashboard, Chef orders; triggers React Query refetch.
- [ ] Only active at scrollTop 0 on touch devices; a11y-safe (no keyboard trap).
- [ ] E2E: simulated touch drag triggers refetch (or component-level test if Playwright touch simulation proves flaky — will report, not weaken).
- Skill: update `mobile-ux-patterns`.

### Slice 8 — Receipt-style dish reviews (`feature/local-review-receipts`)

- [ ] Orders/Profile: recent COMPLETED+PAID orders rendered as receipts (items, prices, date) with per-dish "Leave a review" buttons (hidden when already reviewed).
- [ ] Review form preselects order + dish from the receipt (fix ignored `dishId` param).
- [ ] Keep chef approval + coupon flow untouched.
- [ ] E2E: complete order → receipt appears → review a dish → dish button disappears.
- Skill: `.cursor/skills/review-flows`.

### Slice 9 — Dynamic estimated ready time (`feature/local-dynamic-eta`) — **last, per Captain**

- [ ] ETA = f(active order queue volume, per-dish `Dish.prepTime`, quantities) replacing `15 + items*5`; details proposed in a mini-plan before this slice (returns to approval gate).
- Skill: update `order-lifecycle`.

## Dependencies

- Slice 5 depends on Slice 4 (delivery model). Slice 6 depends on Slice 5. Slice 9 is last.
- Slices 1–3 are independent and go first.

## Non-Goals

- Native iOS/Capacitor work, password reset, AI order attribution (separate priorities).
- Removing the `/api/ai/build-meal` backend endpoint (UI removal only).
- Websocket infrastructure (polling chosen for tracking).

## Risks

| Risk | Mitigation |
|------|-----------|
| Enum + column migrations on live Render Postgres | Additive-only migrations; `prisma migrate deploy` already in build; rollback checkpoints per slice |
| Hiding unpaid orders confuses in-flight checkouts | Confirmation/tracking screen still shows the customer's own order regardless of payment status |
| Playwright touch simulation flaky for pull-to-refresh | Fall back to component-level gesture test; report honestly |
| Existing payment E2E regressions | Full payment-flow spec runs as a gate on every slice |

## Validation per Slice (Definition of Done)

- Frontend build (`tsc && vite build`) passes
- Backend `npm run test:all` 49+/49+ passes
- Slice-specific Playwright E2E + full payment-flow spec pass
- Browser screenshot evidence under `.agent/evidence/`
- Accessibility notes for UI slices; security notes for payment/webhook slices
- PROGRESS.md / TESTING.md / CHANGELOG.md updated; skill created or updated

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-08-15
- **Approved revision:** `post-launch-ux-batch-2026-08-15` with the complete dorm/location list supplied in chat
- **Implementation sequence:** Begin with Slice 1; each later slice remains gated by the validation and PR process documented above.
