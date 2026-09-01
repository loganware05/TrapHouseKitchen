---
name: ios-pull-to-refresh
description: Default pull-to-refresh expectation for iOS/Capacitor and mobile-first web apps in Captain's Compass
---

# iOS Pull-to-Refresh (Default)

## Policy

Unless the Captain explicitly waives it in an approved implementation plan, **every primary screen** in an iOS/Capacitor or mobile-first web app must support **pull-to-refresh** so users can fetch the latest data for the tab they are viewing.

## Traphouse Kitchen implementation

| Piece | Path |
|-------|------|
| Logic | `frontend/src/lib/pullToRefreshLogic.ts` |
| Hook | `frontend/src/hooks/usePullToRefresh.ts` |
| Layout wrapper | `frontend/src/components/Layout.tsx` + `PullToRefresh` |
| Route registry | `frontend/src/contexts/PullToRefreshContext.tsx` |
| Page registration | `useRegisterPullToRefresh(handler)` in each routable page |

## Rules

1. Touch-only; arms at `scrollTop === 0`; vertical-dominant gesture.
2. Disabled while `CheckoutSheet` is open (Layout handles this).
3. Each page registers its own invalidation/refetch handler on mount.
4. Do not nest multiple `PullToRefresh` wrappers — use the Layout-level wrapper only.
5. No heavy gesture libraries.

## When adding a new screen

1. Implement `handlePullRefresh` that invalidates/refetches that screen's queries.
2. Call `useRegisterPullToRefresh(handlePullRefresh)` at the top level of the page component.
3. Add the screen to the surfaces list in `mobile-ux-patterns` skill if it is a primary tab.

## Validation

```bash
cd frontend && npx tsx src/lib/pullToRefreshLogic.selftest.ts
```

Optional: `e2e/mobile.spec.ts` touch pull on Orders tab.

## Waivers

Document any screen that intentionally omits pull-to-refresh in `IMPLEMENTATION_PLAN.md` with Captain approval.
