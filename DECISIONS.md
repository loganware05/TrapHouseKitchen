# Decisions

Record architectural and process decisions here (ADR style).

## Template

### ADR-XXX: Title

- **Status:** Proposed | Accepted | Superseded | Deprecated
- **Date:**
- **Context:**
- **Decision:**
- **Consequences:**

---

### ADR-001: Stop minting $4 coupons on review approval

- **Status:** Superseded by ADR-004
- **Date:** 2026-08-21
- **Context:** Review approval created a $4 coupon, but customers could not reliably apply coupons to reduce checkout price. Messaging promised a reward that did not work.
- **Decision:** Chef approve/reject remains; **do not** create coupons on approve. Leave existing coupon validate/apply APIs for a later dedicated fix. Soften customer/chef copy accordingly.
- **Consequences:** Existing unused coupons may still show on My Reviews; checkout coupon field still present for legacy codes / future work.

---

### ADR-004: Chef-gated review coupons with configurable amount

- **Status:** Accepted
- **Date:** 2026-08-26
- **Supersedes:** ADR-001
- **Context:** Checkout discounts are being fixed (Slice 10). Captain wants the previous review-approve mint path restored as the default award gateway, with chef control over enablement **and** discount amount. Message-based coupon delivery stays on the waiting list.
- **Decision:** `CouponAwardGateway` (`REVIEW_APPROVE`) defaults enabled with `$4.00`; chef may toggle and set amount ($1–$50). Approve mints only when enabled. Checkout resolves `couponCode` and/or `appliedCouponId` into Stripe PI amount; soft-reserve against concurrent open checkouts.
- **Consequences:** Chef Reviews page hosts gateway controls; customers enter codes at checkout as before.

---

### ADR-005: Review edits require chef re-approval

- **Status:** Accepted
- **Date:** 2026-08-30
- **Context:** Customers could edit approved reviews while they remained public. Captain wants edits to re-enter the approval queue.
- **Decision:** `PATCH /reviews/:id` sets `approved: false` when content changes on a previously approved review. Re-approve does not mint a duplicate coupon if `sourceReviewId` already exists.
- **Consequences:** Unified Reviews tab shows community feed first, then customer's own reviews; chef pending queue receives re-submissions.

---

### ADR-002: Status-weighted prep queue includes READY

- **Status:** Accepted
- **Date:** 2026-08-22
- **Context:** Slice 9 dynamic ETA. Captain wants READY orders in kitchen queue visibility/load, but not treated equal to PREPARING (3 ready + 2 preparing should not imply ~40 min queue penalty).
- **Decision:** Count PENDING/PREPARING/READY in queue; apply weights 8/8/2 minutes respectively; OUT_FOR_DELIVERY excluded.
- **Consequences:** Formula lives in `prepTime.service.ts`; unit tests cover mixed-status scenarios.

---

### ADR-003: Prep learning orchestrator is live-gated

- **Status:** Accepted
- **Date:** 2026-08-22
- **Context:** Captain wants estimates to improve from completed-order trends after consistent live volume; must not skew estimates before enough data.
- **Decision:** Record observations on COMPLETED; apply median bias only when `PREP_LEARNING_ENABLED=1` and sample count ≥ threshold; full test coverage before production flag; dish-level suggestions default to chef-visible suggestions, not silent auto-write.
- **Consequences:** New `PrepTimeObservation` table; env var on Render; chef dashboard panel.
