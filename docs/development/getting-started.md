# Getting Started

Welcome! This guide will help you get TrapHouse Kitchen running locally in minutes.

---

## Quick Start

```bash
# 1. Navigate to project directory
cd "/Users/loganware/Documents/Buisness/TrapHouseKitchen v2"

# 2. Run automated setup
./scripts/setup.sh

# 3. Validate setup
./scripts/validate-setup.sh

# 4. Start the application
npm run dev
```

**Access the app:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## Default Credentials

**Chef Account:**
- Email: `chef@traphouse.com`
- Password: `chef123`

**Customer Account:**
- Register at: http://localhost:5173/register
- Or use guest checkout

---

## Using Docker

```bash
# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Testing the PWA on Mobile

### Get Your Local IP

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Update Frontend .env

```bash
echo "VITE_API_URL=http://YOUR_IP:3001/api" > frontend/.env
```

### On iPhone

1. Open Safari
2. Go to `http://YOUR_IP:5173`
3. Tap Share → "Add to Home Screen"

---

## Common Development Tasks

### View Database
```bash
cd backend
npx prisma studio
# Opens at http://localhost:5555
```

### Create Migration
```bash
cd backend
npx prisma migrate dev --name your_migration_name
```

### Check Logs
- Backend: Check terminal output
- Frontend: Browser console (F12)
- Docker: `docker-compose logs backend`

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Database Connection Error
```bash
docker-compose ps postgres
docker-compose restart postgres
```

### Module Not Found
```bash
cd backend && npm install
cd ../frontend && npm install
```

### Prisma Client Error
```bash
cd backend
npx prisma generate
```

---

## Next Steps

- Read the [Testing Guide](testing.md)
- Review [Architecture](architecture.md)
- Check [README.md](../../README.md) for full documentation

**Happy coding! 🚀**
