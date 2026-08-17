---
name: react-engineering
description: Implements React and TypeScript UI changes with accessible components, state, and client tests
---

# React Engineering

## Use this Skill when

Working on React components, hooks, client routing, forms, browser behavior, responsive layout, or UI tests in a React/Vite/Next-style repository.

## Inputs

- Approved IMPLEMENTATION_PLAN.md
- Existing component and styling conventions
- Accessibility expectations from PROJECT_CONTEXT.md

## Procedure

1. Match existing project patterns (file layout, styling, state library).
2. Prefer small, focused components with clear props.
3. Label form controls; associate errors with fields (`aria-invalid`, `aria-describedby`).
4. Keep client state minimal; avoid unrelated refactors.
5. Add or update unit/component tests for behavior changes.
6. For user-visible UI, capture screenshot evidence under `.agent/evidence/`.
7. Run the project's lint and unit test commands before handoff.

## Route active-state matching

When a layout nav item maps to both a parent path and child routes (e.g. Chef Dashboard at `/chef` vs `/chef/orders`):

- Use **exact match** for the parent/dashboard route (`pathname === '/chef'`).
- Use **prefix match** only for routes with real nested segments (`pathname === to || pathname.startsWith(\`${to}/\`)`).
- Avoid `startsWith('/chef')` for Dashboard — it will stay highlighted on every `/chef/*` page.

Example helper pattern:

```typescript
if (to === '/chef') return pathname === '/chef';
return pathname === to || pathname.startsWith(`${to}/`);
```

## Output

Changed React/TS files, tests, and evidence paths reported to the First Mate.

## Prohibited actions

- Do not introduce a new UI framework without plan approval.
- Do not disable accessibility attributes to silence warnings.
- Do not expand into backend/auth refactors unless the approved plan includes them.
