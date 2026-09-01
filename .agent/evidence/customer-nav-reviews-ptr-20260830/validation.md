# Slice 11 validation — customer nav, reviews, re-approval, PTR

**Date:** 2026-08-30 (pre-merge); **post-merge recheck:** 2026-08-31  
**Branch:** `feature/local-customer-nav-reviews-ptr` → merged PR #27  
**Merge commit:** `76e21a0` on `main`  
**Checkpoint:** `checkpoint/customer-nav-reviews-ptr-2026-08-28`

## Captain decisions applied

- Customer tabs: Home · Reviews · Requests · Orders (Menu off-tab via Home)
- Profile receipts: collapsible, max 3 within 30-day window, **below Legal**
- Profile: saved cards, allergen profile, dietary preferences **removed**
- Reviews tab: Community first, then Your reviews (approved + pending)
- Orders tab: quick reorder, saved discount codes, used codes
- Review edit → re-approval; no duplicate coupon on re-approve

## Validation

| Check | Result |
|-------|--------|
| `cd frontend && npx tsx src/lib/pullToRefreshLogic.selftest.ts` | PASS (2026-08-31 on `main`) |
| `npm run build --prefix frontend` | PASS (2026-08-31 on `main`) |
| `cd backend && npm run test:all` | **85/85 PASS** pre-merge; post-merge full suite occasionally flaky under parallel load — `review-flow.test.ts` passes in isolation |

## Key files

- `frontend/src/components/Layout.tsx` — nav + Layout PTR
- `frontend/src/contexts/PullToRefreshContext.tsx` — route registry
- `frontend/src/pages/ReviewsPage.tsx` — unified reviews
- `frontend/src/pages/ProfilePage.tsx` — receipts dropdown
- `frontend/src/pages/OrdersPage.tsx` — quick reorder + coupon sections
- `backend/src/controllers/review.controller.ts` — re-approval on PATCH
- `backend/src/services/couponGateway.service.ts` — skip duplicate mint
- `.cursor/skills/ios-pull-to-refresh/SKILL.md` — new skill
