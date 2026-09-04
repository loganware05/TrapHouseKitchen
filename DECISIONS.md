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

---

### ADR-005: Password reset tokens hashed at rest

- **Status:** Accepted
- **Date:** 2026-09-01
- **Context:** Slice 12 ships forgot/reset password for soft launch; storing plaintext reset tokens in Postgres is unnecessary exposure if the DB is compromised.
- **Decision:** Generate a cryptographically random raw token for the email link; persist only `SHA-256(rawToken)` in `User.passwordResetToken`. E2E uses `E2E_CAPTURE_PASSWORD_RESET=1` to write raw tokens to `.agent/e2e-capture/` (never in production).
- **Consequences:** Playwright cannot read tokens from DB; capture file or email mock required for auth E2E. Token-in-URL query string remains (follow-up hardening optional).

---

### ADR-006: Coupon code must match applied coupon at PaymentIntent create

- **Status:** Accepted
- **Date:** 2026-09-01
- **Context:** Orders can have `appliedCouponId` from checkout apply; client could send a different `couponCode` when creating a PaymentIntent.
- **Decision:** When both `couponCode` and `order.appliedCouponId` are set, reject with 400 if codes disagree. When only `appliedCouponId` is set, trust the stored coupon without requiring a code.
- **Consequences:** Prevents discount tampering; clients must send matching code or omit `couponCode` when coupon already applied.

---

### ADR-007: Canceled PaymentIntent sets order status CANCELLED

- **Status:** Accepted (unchanged from main)
- **Date:** 2026-09-01
- **Context:** `feat/payment-webhook-hardening` set `paymentStatus: FAILED` on cancel; `main` uses `setOrderStatus(..., 'CANCELLED')`.
- **Decision:** Keep `main` behavior: `payment_intent.canceled` → payment record `CANCELED`, order `status: CANCELLED` (not failed payment).
- **Consequences:** Abandoned checkouts align with auto-cancel cleanup; failed card attempts still use `payment_failed` → `paymentStatus: FAILED`.

---

### ADR-008: Auth-scoped React Query keys + clear on session change

- **Status:** Accepted
- **Date:** 2026-09-03
- **Context:** Customers saw another account’s saved/used coupons after logout/login because TanStack Query keys (`myCoupons`, `orders`, etc.) were global and logout did not clear the cache.
- **Decision:** Include `userId` in private query keys; call `queryClient.clear()` on login, register, guest login, logout, and failed `/me` session restore.
- **Consequences:** Account switches cannot reuse stale private data; public keys (`dishes`, `reviews`) remain shared.

---

### ADR-009: Non-prod password reset link exposure for smoke

- **Status:** Accepted
- **Date:** 2026-09-03
- **Context:** Soft-launch smoke of forgot/reset without Resend inbox.
- **Decision:** When `NODE_ENV !== 'production'` and `SHOW_PASSWORD_RESET_LINK=1`, include `resetUrl` / `resetToken` in forgot-password JSON and show a copyable helper on the forgot-password page. Production never returns the link.
- **Consequences:** Local/staging smoke without email; ops must never set the flag on Render production.

---

### ADR-010: Session token before auth state on login

- **Status:** Accepted
- **Date:** 2026-09-04
- **Context:** After Slice 13 keyed coupons by `userId`, switching accounts could still show the previous user’s codes because `set({ user })` re-enabled queries while axios still read the old JWT from `localStorage`.
- **Decision:** On login/register/guest, `localStorage.setItem('token', …)` runs before `clearAuthScopedQueryCache()` and before Zustand `set({ user, token })`. API Workbox strategy is `NetworkOnly`; `/coupons/my` is `Cache-Control: private, no-store`.
- **Consequences:** New-account fetches always use the new Bearer token; stale SW/API cache cannot resurrect another user’s coupon list.

---
