# Security follow-up — staging reset-link exposure

Date: 2026-11-12  
PR: #39  
Finding: MEDIUM — unauthenticated forgot-password could return live reset token on public staging when `SHOW_PASSWORD_RESET_LINK=1` + `APP_ENV=staging`.

## Remediation

- Staging exposes `resetUrl`/`resetToken` only when `PASSWORD_RESET_SMOKE_SECRET` is set **and** the request presents a matching `X-Password-Reset-Smoke-Secret` header (or body `smokeSecret`), compared with `timingSafeEqual`.
- If the env secret is unset on staging, the link is never returned (fail closed).
- Production (`APP_ENV` not `staging`) never returns the link even if flags/secrets are mis-set together with a header.
- Blueprint: `PASSWORD_RESET_SMOKE_SECRET` is `sync: false` (dashboard only); docs updated with curl smoke example.

## Review links

- https://github.com/loganware05/TrapHouseKitchen/pull/39#discussion_r4558226914
- https://github.com/loganware05/TrapHouseKitchen/pull/39#pullrequestreview-5884274632
