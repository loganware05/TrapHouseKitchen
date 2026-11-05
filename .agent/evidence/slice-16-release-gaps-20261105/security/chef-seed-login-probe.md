# Production Chef seed-credential probe

- Date: 2026-11-05
- Target: `https://traphousekitchen-api.onrender.com/api/auth/login`
- Account probed: seed Chef id `chef-1` / email `chef@traphouse.com`
- Result: **HTTP 200** with JWT — documented local seed password still accepted
- Action required: rotate immediately via Render shell:

```bash
cd backend
USER_EMAIL='chef@traphouse.com' NEW_PASSWORD='<strong unique secret>' npx tsx scripts/set-user-password.ts
```

- Also confirm no other accounts reuse published demo passwords.
- Probe response body was not retained; login artifact files deleted after check.
