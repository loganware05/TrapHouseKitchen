# TrapHouse Kitchen - Restaurant Web Application

Restaurant web app for allergen-aware ordering, chef kitchen ops, Stripe checkout, reviews/coupons, and dish request voting.

**Project status (single source of truth):** [STATUS.md](STATUS.md)

Historical “READY / COMPLETE” write-ups live under [docs/archive/snapshots/](docs/archive/snapshots/) — do not treat them as current status.

## Documentation

| Doc | Purpose |
|-----|---------|
| [STATUS.md](STATUS.md) | Shipped / WIP / ops gaps |
| [docs/development/getting-started.md](docs/development/getting-started.md) | Local setup |
| [docs/deployment/render.md](docs/deployment/render.md) | Render deploy |
| [docs/deployment/go-live.md](docs/deployment/go-live.md) | Live Stripe cutover checklist |
| [docker/README.md](docker/README.md) | Docker / Compose layout |
| QA checklist | Lands with `chore/test-harness-ci` — see [STATUS.md](STATUS.md) |

### Quick local test (Docker)

```bash
# Docker Desktop running, then:
./run-tests.sh
```

---

## Features

### Customer Features
- **Browse Menu** - View dishes organized by categories with detailed information (only available dishes shown)
- **Allergen Safety** - Set allergen profile and get automatic warnings for incompatible dishes
- **Dietary Preferences** - Filter menu based on dietary restrictions (Vegan, Vegetarian, Gluten-Free, etc.)
- **Order Management** - Place orders and track their status in real-time
- **Per-Dish Reviews** - Review each dish separately from completed orders; earn a $4 discount code when approved
- **Dish Requests** - Suggest new dishes and vote on community requests (Reddit-style voting)
- **Guest Checkout** - Order without creating an account

### Chef Features
- **Dashboard** - Overview of orders, menu items, and popular requests
- **Menu Management** - Full CRUD operations for dishes, ingredients, and allergens (soft delete for dishes)
- **Order Processing** - View and update order statuses (Pending → Preparing → Ready → Completed); see paid and pending orders
- **Requests** - View and manage dish requests from customers
- **Review Management** - Approve or reject dish reviews; approved reviews generate discount codes for customers

### Technical Features
- **Stripe Payments** - Credit cards, Apple Pay, Cash App Pay via Stripe
- **Progressive Web App (PWA)** - Add to iOS home screen for app-like experience
- **Capacitor iOS scaffold** - On feature branch; `frontend/ios` generated locally (not App Store ready) — [STATUS.md](STATUS.md)
- **Mobile-First Design** - Optimized for iPhone and mobile devices
- **QR Code Access** - Easy access via QR code scanning
- **Role-Based Access Control (RBAC)** - Separate customer and chef interfaces
- **Real-Time Updates** - React Query for automatic data synchronization
- **Docker** - Compose/Dockerfile under [`docker/`](docker/) with root symlinks
- **Render & AWS** - `render.yaml` blueprint; ECR image build via GitHub Actions

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for blazing-fast builds
- TailwindCSS for styling
- React Router for navigation
- Zustand for state management
- TanStack Query for data fetching
- PWA support with vite-plugin-pwa

**Backend:**
- Node.js with Express
- TypeScript
- Prisma ORM
- PostgreSQL database
- JWT authentication
- bcryptjs for password hashing

**DevOps:**
- Docker & Docker Compose (see [`docker/README.md`](docker/README.md))
- AWS ECR for container registry
- Health checks and monitoring

## Installation

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (optional but recommended for Postgres)
- PostgreSQL (or use Docker Compose)

### Quick Start with Docker

1. **Clone the repository**
```bash
cd "TrapHouseKitchen v2"
```

2. **Set up environment variables**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

3. **Start with Docker Compose** (root symlinks → `docker/`)
```bash
docker compose up -d
```

4. **Sync the database**
```bash
docker compose exec backend npx prisma migrate deploy
# Fresh local DBs: migrate deploy. Existing prod DBs that used db push:
# see docs/deployment/MIGRATION_BASELINE.md (after migrations PR lands).
```

5. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Health: http://localhost:3001/health

### Manual Installation

**Backend Setup:**
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

## 🚀 Deployment

### Build for Production

```bash
# Build both frontend and backend
npm run build

# Or build separately
npm run build:backend
npm run build:frontend
```

### Deploy to Render

The project includes a `render.yaml` blueprint:

- **Backend:** Prefer `prisma migrate deploy` (see [docs/deployment/render.md](docs/deployment/render.md) and [STATUS.md](STATUS.md))
- **Frontend:** Static site built from `frontend/` directory
- **Database:** PostgreSQL (create manually, then link via `DATABASE_URL`)

Required environment variables: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `STRIPE_*` keys. Full list: [docs/deployment/DEPLOYMENT_ENV_VARS.md](docs/deployment/DEPLOYMENT_ENV_VARS.md).

### Deploy to AWS ECR

1. **Create ECR Repository**
```bash
aws ecr create-repository --repository-name traphouse-kitchen --region us-east-1
```

2. **Configure environment variables**
```bash
export AWS_REGION=us-east-1
export ECR_REPOSITORY=traphouse-kitchen
```

3. **Run deployment script**
```bash
chmod +x deploy-ecr.sh
./deploy-ecr.sh v1.0.0
```

The script will:
- Log in to AWS ECR
- Build the Docker image
- Tag the image
- Push to ECR
- Output the image URI for deployment

### Environment Variables

**Backend (.env):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/traphouse_kitchen
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Stripe (required for payments)
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Frontend (.env):**
```env
VITE_API_URL=https://api.yourdomain.com/api
```

## 📱 Progressive Web App (PWA)

The application is configured as a PWA with:
- Offline support
- Add to home screen capability
- iOS-optimized icons and splash screens
- Service worker for caching

### iOS Installation
1. Open the app in Safari
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

## 🗄️ Database Schema

Key entities:
- **Users** - Customer and chef accounts with roles
- **Dishes** - Menu items with pricing and metadata
- **Categories** - Organization for menu items
- **Ingredients** - Components of dishes
- **Allergens** - Allergen information with severity levels
- **Orders** - Customer orders with status tracking
- **Reviews** - Per-dish reviews (one per dish per order); chef approval generates discount codes
- **DishRequests** - Community dish suggestions
- **Votes** - Upvote/downvote system for requests

## Authentication

See [docs/features/authentication.md](docs/features/authentication.md).

- JWT-based authentication
- Role-based access control (Customer, Chef)
- Guest checkout option
- Secure password hashing with bcrypt
- Password reset (feature branch — see [STATUS.md](STATUS.md))

## 📊 API Endpoints

### Public Endpoints
- `GET /api/dishes` - List all dishes (default: available only)
- `GET /api/categories` - List categories
- `GET /api/allergens` - List allergens
- `GET /api/reviews` - List approved reviews
- `GET /api/dish-requests` - List dish requests

### Protected Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/guest` - Guest login
- `GET /api/users/profile` - Get user profile
- `POST /api/users/allergens` - Update allergen profile
- `POST /api/orders` - Create order
- `GET /api/reviews/eligible-orders` - Get orders with unreviewed dishes
- `POST /api/reviews` - Create review (requires `orderId`, `dishId`, `rating`, `comment`)
- `GET /api/reviews/my` - Get user's reviews
- `POST /api/dish-requests` - Create dish request
- `POST /api/dish-requests/:id/vote` - Vote on request

### Chef-Only Endpoints
- `POST /api/dishes` - Create dish
- `PUT /api/dishes/:id` - Update dish
- `DELETE /api/dishes/:id` - Soft delete dish (sets status to UNAVAILABLE)
- `GET /api/orders/all` - View all orders (paid and pending)
- `PATCH /api/orders/:id/status` - Update order status
- `GET /api/reviews/pending` - View pending reviews
- `POST /api/reviews/:id/approve` - Approve review (creates discount code)
- `POST /api/reviews/:id/reject` - Reject review

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Headless validation scripts (no DB required)
cd backend
npx tsx scripts/test-review-system.ts   # Per-dish review logic
npx tsx scripts/test-dish-filter.ts    # Dish availability filtering
npx tsx scripts/test-order-filter.ts   # Chef order visibility
```

## 🛠️ Development

### Project Structure
```
TrapHouseKitchen v2/
├── README.md              # Product overview
├── STATUS.md              # Living project status (canonical)
├── render.yaml            # Render deployment config
├── package.json           # Root scripts (not npm workspaces)
│
├── docs/                  # Documentation
│   ├── deployment/        # Deploy / env / go-live
│   ├── development/       # Local development
│   ├── features/          # Feature docs
│   └── archive/           # Historical + snapshots/
│
├── scripts/               # Deployment & setup scripts
│
├── docker/                # Dockerfile + Compose (root symlinks point here)
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── lib/
│   │   └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/    # After migrations PR lands
│   ├── scripts/          # Migration & headless test scripts
│   │   ├── migrate-reviews-to-dish-based.ts
│   │   ├── add-dish-review-columns.sql
│   │   ├── test-review-system.ts
│   │   ├── test-dish-filter.ts
│   │   └── test-order-filter.ts
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── pages/         # Page components
    │   ├── components/    # Reusable components
    │   ├── stores/        # Zustand stores
    │   ├── types/         # TypeScript types
    │   └── lib/          # API client
    ├── public/            # Static assets
    ├── index.html         # Entry point
    └── package.json
```

### Key Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only

# Setup
./scripts/setup.sh           # Automated setup
./scripts/validate-setup.sh  # Validate configuration

# Deployment
./scripts/deploy-ecr.sh v1.0.0    # Deploy to AWS ECR
./scripts/deploy-render.sh        # Deploy to Render

# Database
cd backend
npx prisma studio        # Open Prisma Studio
npx prisma migrate dev   # Create migration
npx prisma generate      # Generate Prisma client

# Production
npm run build            # Build for production
npm start                # Start production server
```

## 📚 Documentation

All documentation is organized in the `docs/` directory:

- **Getting Started:** [docs/development/getting-started.md](docs/development/getting-started.md)
- **Architecture:** [docs/development/architecture.md](docs/development/architecture.md)
- **Testing Guide:** [docs/development/testing.md](docs/development/testing.md)
- **Render Deployment:** [docs/deployment/render.md](docs/deployment/render.md)
- **AWS Deployment:** [docs/deployment/aws.md](docs/deployment/aws.md)
- **Environment Variables:** [docs/deployment/environment-variables.md](docs/deployment/environment-variables.md)
- **Stripe Payments:** [docs/features/stripe-payments.md](docs/features/stripe-payments.md)

## 📝 License

This project is proprietary software for TrapHouse Kitchen.

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

## 📧 Support

For technical support or questions, please contact the system administrator.

---

**Built with ❤️ for TrapHouse Kitchen**

