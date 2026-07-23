# Project Context

## Product Summary

Traphouse Kitchen is a mobile-first ghost kitchen app for college students in Tuskegee, Alabama — a food desert where late-day options are scarce. Customers browse allergen-aware dishes, place orders (including guest checkout), suggest/vote on dish requests, and pay via Stripe. Chefs manage the menu, fulfill orders, review feedback, and see demand signals (who wants to order today and which dish requests are most popular). Primary go-to-market is a Capacitor iOS app (App Store), backed by a React PWA and Express API.

## Intended Users

- **Customers:** Local college students (~<200 person community target) needing food when other places are closed.
- **Chef (operator):** The kitchen operator who runs the menu, orders, reviews, and request queue. Use the term **Chef** (not Admin) in product and agent language.

## Primary User Problems

- **Customers:** Need suggested and alternative food options after other local food places close for the day.
- **Chef:** Needs visibility into same-day order demand (how many customers are looking to order) and the most popular suggested dish requests so they can cook what the community actually wants.

## Success Metrics

Next 30–90 days:

- App Store deployment of the iOS app
- Real orders placed end-to-end (including Stripe live payments re-verified after recent repo changes)
- Revenue generated
- Consistent recurring customers within the small local community (<200 people)

Near-term operational success: complete pre-launch verification (soft launch already happened; Stripe and related flows must be retested before calling launch done).

## Current Technology Stack

| Layer | Stack |
|-------|--------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, React Router, Zustand, TanStack Query, vite-plugin-pwa, Stripe React SDK |
| Backend | Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, JWT + bcryptjs, Stripe, express-rate-limit |
| Native | Capacitor iOS scaffold (feature branch; not yet on `main` / not App Store ready) |
| Local devops | Docker Compose under `docker/` (preferred); Node + local Postgres also acceptable |
| CI | GitHub Actions (Vitest unit/integration; Playwright E2E currently non-blocking) |
| Production host | Render (`render.yaml`: API web service, static frontend, managed Postgres) |

## Repository Map

| Path | Role |
|------|------|
| `frontend/` | Customer + Chef React SPA / PWA |
| `backend/` | Express API, Prisma schema/migrations, Vitest tests |
| `docker/` | Dockerfile + Compose for local stack (root symlinks) |
| `e2e/` | Playwright specs |
| `docs/` | Deployment, development, features, archive |
| `.cursor/` | Captain’s Compass rules + skills |
| `AGENTS.md` | Agent operating contract |
| `STATUS.md` | Canonical Shipped / WIP / Broken status |
| `render.yaml` | Production blueprint (Render) |
| `vercel.json` | **Legacy / unused** — do not treat as deploy target |

## Major Components

- **Customer app:** Menu browse, allergens/dietary filters, cart, guest checkout, Stripe payment, order tracking, per-dish reviews, dish request voting, profile
- **Chef app:** Dashboard, menu CRUD, order pipeline (Pending → Preparing → Ready → Completed), dish requests, review approve/reject (+ coupon issuance)
- **Payments:** Stripe PaymentIntent + webhooks (hardening slice not yet on `main`)
- **Auth:** JWT RBAC (customer vs Chef); password reset not yet on `main`
- **Analytics / AI attribution:** Tip and order attribution features exist on feature branches; land after payment + iOS priorities

## External Services

| Service | Use |
|---------|-----|
| Stripe | Payment processing. **Pre-launch / QA:** use Stripe **test (sandbox)** keys (`sk_test_` / `pk_test_`) locally or on a dedicated test env. **Production (real customers):** live keys on Render only. Publishable and secret keys must always match mode (never mix test pk with live sk). |
| Render | Production API, static web, Postgres |
| Resend (planned/optional) | Transactional email (e.g. password reset) once that feature lands — needs `RESEND_API_KEY` + `FRONTEND_URL` |
| Apple App Store | Target distribution for Capacitor iOS |

**Not used for production:** Vercel, AWS ECR/ECS (removed), Floci (see Deployment Targets).

## Data Sources

- PostgreSQL via Prisma (primary system of record: users, dishes, orders, allergens, reviews, coupons, dish requests)
- Stripe as source of truth for payment status (webhooks must stay authoritative after hardening lands)
- Client analytics stores (frontend) for spend/tracking UI — not a substitute for server order data

## Environments

| Environment | Status |
|-------------|--------|
| Local | Active (Docker Compose preferred) |
| Staging | Stale — last used ~3 months ago, before recent repo changes; treat as unavailable until recreated |
| Production | Soft-launched / previously live on Render; must re-verify Stripe and critical flows after recent merges before pre-launch |

Default working assumption: **local + production only** until staging is intentionally rebuilt.

## Deployment Targets

- **Production:** Render only (`render.yaml`). Sole production host.
- **Vercel:** Unused legacy config (`vercel.json`). Do not deploy here.
- **Floci evaluation (2026-07-22):** [floci-io/floci](https://github.com/floci-io/floci) is a **local AWS emulator** (LocalStack-style: S3, Lambda, RDS emulation on `localhost:4566`). It is **not** a managed hosting platform and **cannot replace Render** for serving the customer/Chef app or managed Postgres in production. Optional future use: local/CI AWS service mocking only if the stack grows AWS dependencies. **Decision: keep Render for production.**

## Security Boundaries

Baseline (to be enforced and expanded via security reviews on each change):

- Never commit secrets (`.env`, Stripe live keys, JWT secrets, webhook secrets, Resend keys)
- Card data never touches our servers — Stripe.js / Payment Element only (PCI SAQ A posture)
- JWT auth with role separation: customer routes vs Chef routes; Chef APIs must reject customer tokens
- Rate limiting on auth and sensitive endpoints
- Webhook endpoints verify Stripe signatures; do not trust unsigned body payloads
- CORS locked to known `FRONTEND_URL` / app origins
- Password reset (when landed): store only hashed tokens; short TTL; single-use
- Production DB and Render env vars are privileged; agents must not perform destructive prod actions without explicit Captain approval

Captain requested ongoing security guidance: run the security-review skill on auth, payment, webhook, and deploy changes; record evidence under `.agent/evidence/security/`.

## Accessibility Expectations

**WCAG 2.1 AA** for customer and Chef web/PWA surfaces (and iOS WebView content where applicable). UI changes require accessibility review per Captain’s Compass.

## Performance Expectations

Priority order:

1. **Mobile-first load time** (customer ordering path on phones)
2. **Chef kitchen dashboard refresh** latency (order state must feel current during service)

Optimize for a small concurrent user base (<200 community) rather than large-scale horizontal load.

## Known Constraints

- Small community TAM (<200); product choices should favor reliability and local ops over multi-tenant scale
- **Delivery is not modeled in the product today** — fulfilled soft-launch orders show ~5–10 minutes from “marked for delivery” to arrival; delivery status/ETA is a known product gap
- Operating hours not built
- Password reset, payment/webhook hardening, Capacitor iOS, and AI order attribution exist off `main` (see Current Priorities)
- Playwright E2E: job runs but many specs fail; CI treats E2E as non-blocking
- Staging environment not currently available
- Legal contact placeholders in Privacy/Terms still need real values for launch

## Known Technical Debt

- Feature work merged to `chore/prisma-migrations-baseline` but not re-landed on `main` (password reset, payment hardening, AI attribution, Capacitor iOS)
- Password-reset token hashing debt once that feature lands (plaintext tokens on that branch)
- Playwright suite instability (~14/19 failing historically)
- Soft-launch Stripe flows need full retest after recent repository changes
- Webhook-related email TODOs (failed payment / refund) live in the payment slice not yet on `main`
- Legacy `vercel.json` may confuse deploy tooling if not ignored

## Terminology

| Term | Meaning |
|------|---------|
| **Traphouse Kitchen** | The application / product name (use this casing in agent docs and copy) |
| **Chef** | Kitchen operator / admin role and UI (never “Admin” in user-facing or agent language) |
| **Dish** | Menu food item (prefer over “Item” / “Product”) |
| **Dish request** | Customer-suggested dish with community voting |
| **Customer** | End user ordering food |
| **Captain** | Human product owner |
| **First Mate** | Coordinating agent under Captain’s Compass |

## Important Commands

```bash
# Install (root + workspaces)
npm run bootstrap

# Local dev (API + Vite)
npm run dev

# Docker Compose (preferred local stack)
docker compose up -d
docker compose exec backend npx prisma migrate deploy

# Tests
cd backend && npm run test:all          # unit + integration (Vitest)
./run-tests.sh                          # Docker-oriented test helper
npm run test:e2e                        # Playwright (expect failures until stabilized)
npm run verify                          # migration layout checks + backend tests

# Production-shaped build
npm run build
```

## Local Development Setup

1. Node.js 20+
2. Prefer Docker Desktop + `docker compose up -d` (Postgres + services per `docker/`)
3. Copy `backend/.env.example` → `backend/.env` (and frontend `.env` as needed)
4. `npm run bootstrap`
5. Apply migrations: `docker compose exec backend npx prisma migrate deploy` (or local Prisma equivalent)
6. Frontend http://localhost:5173 · API http://localhost:3001 · Health `/health`

Node + local Postgres is acceptable when Docker is unavailable. See `docs/development/getting-started.md` and `docker/README.md`.

## Current Priorities

Pre-launch verification first, then land features onto `main` in this order:

1. **Pre-launch / regression verification** — especially Stripe live payments, webhooks, and critical customer + Chef flows after recent repo changes
2. **Password reset** (`feat/password-reset` / former PR #4)
3. **Payment / webhook hardening** (`feat/payment-webhook-hardening` / former PR #5)
4. **Capacitor iOS** (`feat/capacitor-ios-scaffold` / former PR #7) → App Store path
5. **AI order attribution** (`feat/ai-order-attribution` / former PR #6)
6. **Delivery modeling** (status/ETA; observed 5–10 min after marked for delivery) — not yet scoped as an approved implementation plan
7. Staging rebuild (optional but useful before App Store launch)
8. Playwright E2E stabilization and WCAG 2.1 AA hardening

Canonical ship status: always check `STATUS.md`.
