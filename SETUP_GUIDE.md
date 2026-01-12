# Quick Start Guide - TrapHouse Kitchen

## 🚀 First Time Setup

### Prerequisites
- Node.js 20+ installed
- Docker and Docker Compose installed
- Git installed

### Step 1: Initial Setup

```bash
# Navigate to project directory
cd "/Users/loganware/Documents/Buisness/TrapHouseKitchen v2"

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Environment Configuration

```bash
# Create backend environment file
cp backend/.env.example backend/.env

# Edit backend/.env with your settings
# At minimum, update:
# - JWT_SECRET (use a strong random string)
# - DATABASE_URL (if not using Docker)
```

### Step 3: Start with Docker (Recommended)

```bash
# Start all services (database, backend, frontend)
docker-compose up -d

# Wait for services to be healthy (about 30 seconds)

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Optional: Seed database with sample data
docker-compose exec backend npx prisma db seed
```

### Step 4: Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **API Health Check:** http://localhost:3001/health
- **Prisma Studio:** Run `cd backend && npx prisma studio` (http://localhost:5555)

### Step 5: Create Chef Account

**Option A - Using the default seeded account:**
- Email: `chef@traphouse.com`
- Password: `chef123`

**Option B - Create a new chef account:**
1. Register a normal account at http://localhost:5173/register
2. Open Prisma Studio: `cd backend && npx prisma studio`
3. Find your user in the User table
4. Change the `role` field from `CUSTOMER` to `CHEF`
5. Log out and log back in

## 🛠️ Development Commands

### Running the Application

```bash
# Start everything (from root)
npm run dev

# Or start individually:
npm run dev:backend    # Backend only
npm run dev:frontend   # Frontend only
```

### Database Management

```bash
cd backend

# View/edit database in browser
npx prisma studio

# Create a new migration
npx prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate
```

### Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers after code changes
docker-compose up -d --build

# Remove all data (including database)
docker-compose down -v
```

## 📱 Testing PWA Features

### On iPhone/iOS:

1. Open Safari and navigate to http://localhost:5173
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right
5. The app will appear on your home screen

**Note:** For local testing, you'll need to:
- Use your computer's local IP instead of localhost
- Or deploy to a public URL with HTTPS

### Testing PWA on Desktop:

**Chrome/Edge:**
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Manifest" to view PWA manifest
4. Click "Service Workers" to verify service worker
5. Install button should appear in address bar

## 🔧 Common Issues & Solutions

### Port Already in Use

```bash
# Find and kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9

# Find and kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9

# Find and kill process on port 5432 (postgres)
lsof -ti:5432 | xargs kill -9
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# View PostgreSQL logs
docker-compose logs postgres
```

### Prisma Client Issues

```bash
cd backend

# Regenerate Prisma client
npx prisma generate

# If schema changed, run migration
npx prisma migrate dev
```

### Module Not Found Errors

```bash
# Clean install all dependencies
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

## 🎯 Testing the Application

### Customer Flow:
1. Go to http://localhost:5173
2. Click "Browse Menu"
3. Register or continue as guest
4. Set allergen profile in Profile page
5. Browse menu (incompatible dishes will be marked)
6. Add items to cart
7. Place order
8. View order status in Orders page

### Chef Flow:
1. Log in with chef credentials
2. View dashboard with order statistics
3. Go to "Menu" to add/edit dishes
4. Go to "Orders" to manage customer orders
5. Change order status: Pending → Preparing → Ready → Completed

### Dish Request Flow:
1. Go to "Requests" page
2. Submit a dish idea
3. Vote on other requests (Reddit-style)
4. Chefs can see top requests in dashboard

## 📊 Sample Data

To add sample dishes for testing:

```bash
# Use the Prisma Studio GUI
cd backend
npx prisma studio

# Or create via API
# Log in as chef, then use POST /api/dishes endpoint
```

## 🚢 Deploying to Production

### Build for Production

```bash
# Build both frontend and backend
npm run build

# Test production build locally
cd backend && npm start
```

### Deploy to AWS ECR

```bash
# Set your AWS credentials
export AWS_REGION=us-east-1
export AWS_PROFILE=your-profile

# Run deployment script
chmod +x deploy-ecr.sh
./deploy-ecr.sh v1.0.0
```

### Environment Variables for Production

Make sure to set these in production:

**Backend:**
- `DATABASE_URL` - Production database URL
- `JWT_SECRET` - Strong random secret (use `openssl rand -base64 32`)
- `NODE_ENV=production`
- `FRONTEND_URL` - Your frontend domain

**Frontend:**
- `VITE_API_URL` - Your backend API URL

## 📞 Getting Help

- Check the README.md for detailed documentation
- Review the API endpoints in backend/src/routes/
- Check Docker logs: `docker-compose logs -f`
- View browser console for frontend errors
- Check backend logs in terminal

## 🎉 Success Checklist

- [ ] Application runs on http://localhost:5173
- [ ] Can register and login as customer
- [ ] Can browse menu and view dishes
- [ ] Can set allergen profile
- [ ] Allergen warnings appear on incompatible dishes
- [ ] Can place an order
- [ ] Can log in as chef (chef@traphouse.com / chef123)
- [ ] Chef can create/edit/delete dishes
- [ ] Chef can view and update order statuses
- [ ] Dish request system works
- [ ] PWA can be added to home screen (on supported devices)

---

**Need help?** Review the logs and README, or check the code comments for guidance.

