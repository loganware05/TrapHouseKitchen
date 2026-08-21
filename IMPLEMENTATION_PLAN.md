# Implementation Plan — Slice 8: Receipt-style dish reviews

## Metadata

- Status: **APPROVED**
- Plan ID: `slice-8-review-receipts-2026-08-21`
- Parent plan: `post-launch-ux-batch-2026-08-15` (Slices 1–7 complete; PR #22 merged)
- Issue: `local/review-receipts`
- Base: `origin/main` after PR #22 (`88d6523`)
- Branch: `feature/local-review-receipts`
- Rollback checkpoint: `checkpoint/review-receipts-2026-08-21`
- Created: 2026-08-21
- Last updated: 2026-08-21

## Request

Polish customer dish-review UX around receipt-style completed orders; fix `dishId` preselect; **stop issuing $4 coupons on review approval** (coupon apply path deferred — Captain: never reliably reduced order price; revisit later). Keep chef approve/reject moderation without coupon creation.

## Captain decisions

| Topic | Decision |
|-------|----------|
| Receipt UX | Keep / polish (already relatively working) |
| Surfaces | Orders + Profile |
| Form preselect | Honor `orderId` + `dishId` |
| Review → $4 coupon | **Remove** — approve only; no coupon create |
| Existing coupon APIs / checkout apply | Leave in place for a later slice; do not wire new review rewards |

## Open-question defaults (accepted)

1. Deep-link to existing form (not inline stars)
2. Profile: last 5 COMPLETED+PAID within review window
3. Receipt treatment for COMPLETED+PAID only
4. No confirmation-page review prompt

## Approval Record

- **Status:** APPROVED
- **Approved by:** Captain (Logan)
- **Approval date:** 2026-08-21
- **Defaults accepted:** form deep-link; Profile last 5; completed-only receipts; no confirmation prompt
- **Scope override:** Remove $4 coupon issuance on review approve; defer coupon-on-order work
