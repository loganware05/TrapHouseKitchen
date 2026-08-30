# Slice 11 validation — customer nav, reviews, re-approval, PTR

**Date:** 2026-08-30  
**Branch:** `feature/local-customer-nav-reviews-ptr`  
**Checkpoint:** `checkpoint/customer-nav-reviews-ptr-2026-08-28`

## Captain decisions applied

- Customer tabs: Home · Reviews · Requests · Orders (Menu off-tab via Home)
- Profile receipts: collapsible, max 3 within 30-day window
- Reviews tab: Community first, then Your reviews (approved + pending)
- Review edit → re-approval; no duplicate coupon on re-approve

## Validation

| Check | Result |
|-------|--------|
| `cd frontend && npx tsx src/lib/pullToRefreshLogic.selftest.ts` | PASS |
| `npm run build --prefix frontend` | PASS |
| `cd backend && npm run test:all` | **85/85 PASS** (includes review edit re-approval) |

## Key files

- `frontend/src/components/Layout.tsx` — nav + Layout PTR
- `frontend/src/contexts/PullToRefreshContext.tsx` — route registry
- `frontend/src/pages/ReviewsPage.tsx` — unified reviews
- `frontend/src/pages/ProfilePage.tsx` — receipts dropdown
- `backend/src/controllers/review.controller.ts` — re-approval on PATCH
- `backend/src/services/couponGateway.service.ts` — skip duplicate mint
- `.cursor/skills/ios-pull-to-refresh/SKILL.md` — new skill
