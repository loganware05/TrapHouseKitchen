# 🚀 Getting Started - TrapHouse Kitchen

Welcome! This guide will help you get the TrapHouse Kitchen application up and running in minutes.

## ⚡ Quick Start (Recommended)

The fastest way to get started:

```bash
# 1. Navigate to the project directory
cd "/Users/loganware/Documents/Buisness/TrapHouseKitchen v2"

# 2. Run the automated setup script
./setup.sh

# 3. Validate your setup
./validate-setup.sh

# 4. Start the application
npm run dev
```

That's it! The application should now be running at:
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001

## 📖 What You Just Built

A complete restaurant web application with:
- ✅ Customer ordering system
- ✅ Chef management dashboard
- ✅ Allergen safety features
- ✅ Dish request voting
- ✅ Mobile-optimized PWA
- ✅ Docker deployment ready

## 🔑 Default Login Credentials

**Chef Account:**
- Email: `chef@traphouse.com`
- Password: `chef123`

**Customer Account:**
- Register at: http://localhost:5173/register
- Or use guest checkout (no account needed)

## 🎯 What to Do Next

### For Testing as a Customer:

1. **Browse the Menu**
   - Visit http://localhost:5173/menu
   - View dishes by category
   - Click on dishes to see details

2. **Set Up Allergen Profile**
   - Register or login
   - Go to Profile → Allergen Profile
   - Select your allergens
   - Notice how the menu updates with warnings

3. **Place an Order**
   - Add dishes to cart
   - Click cart icon
   - Complete checkout
   - View order status in "Orders" page

4. **Request a Dish**
   - Go to "Requests" page
   - Submit a dish idea
   - Vote on other requests

### For Testing as a Chef:

1. **Login as Chef**
   - Use credentials above
   - You'll see the Chef Dashboard

2. **Manage Menu**
   - Go to "Menu" section
   - Add a new dish
   - Edit existing dishes
   - Set allergens and ingredients

3. **Process Orders**
   - Go to "Orders" section
   - View pending orders
   - Update order status:
     - Pending → Preparing → Ready → Completed

4. **View Analytics**
   - Check Dashboard for metrics
   - See top dish requests
   - Monitor order flow

## 🐳 Using Docker (Alternative Method)

If you prefer Docker:

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

## 📱 Testing the PWA

### On Your Phone:

1. **Get your computer's local IP:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # The output will be something like: 192.168.1.XXX
   ```

2. **Update frontend .env:**
   ```bash
   # Create frontend/.env
   echo "VITE_API_URL=http://YOUR_IP:3001/api" > frontend/.env
   ```

3. **Restart frontend:**
   ```bash
   npm run dev:frontend
   ```

4. **On your iPhone:**
   - Open Safari
   - Go to http://YOUR_IP:5173
   - Tap Share button
   - Tap "Add to Home Screen"
   - Enjoy the app!

### Generate QR Code:

```bash
# Install qrencode if needed
brew install qrencode  # macOS

# Generate QR code for your phone
qrencode -t ANSI "http://YOUR_IP:5173"
```

## 🛠️ Common Development Tasks

### View Database:
```bash
cd backend
npx prisma studio
# Opens at http://localhost:5555
```

### Create New Migration:
```bash
cd backend
# Edit prisma/schema.prisma
npx prisma migrate dev --name your_migration_name
```

### Add Sample Data:
```bash
# Use Prisma Studio or the API
# Log in as chef and create dishes via the UI
# Or use the POST /api/dishes endpoint
```

### Check Logs:
```bash
# Backend logs (if running with npm)
# Already visible in terminal

# Frontend logs
# Check browser console (F12)

# Docker logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

### Rebuild After Changes:
```bash
# Frontend (automatic with Vite)
# Just save the file

# Backend (with tsx watch)
# Automatically restarts

# Docker (if code changed)
docker-compose up -d --build
```

## 🐛 Troubleshooting

### Port Already in Use:
```bash
# Kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Database Connection Error:
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check connection
cd backend
npx prisma db pull
```

### Module Not Found:
```bash
# Reinstall dependencies
cd backend && npm install
cd ../frontend && npm install
```

### Prisma Client Error:
```bash
cd backend
npx prisma generate
```

## 📚 Learn More

- **Full Documentation:** [README.md](README.md)
- **Detailed Setup:** [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Project Overview:** [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- **API Routes:** `backend/src/routes/`
- **React Components:** `frontend/src/`

## 🎓 Project Structure

```
TrapHouseKitchen v2/
├── backend/              # Express API
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Auth, errors
│   │   └── lib/         # Utilities
│   └── prisma/          # Database
│
├── frontend/            # React App
│   ├── src/
│   │   ├── pages/       # Route pages
│   │   ├── components/  # UI components
│   │   ├── stores/      # State management
│   │   └── types/       # TypeScript types
│   └── public/          # Static assets
│
├── docker-compose.yml   # Docker config
├── Dockerfile           # Container image
└── deploy-ecr.sh        # AWS deployment
```

## 🚢 Ready to Deploy?

### Deploy to Docker:
```bash
docker-compose up -d
```

### Deploy to AWS ECR:
```bash
./deploy-ecr.sh v1.0.0
```

### Deploy to Other Platforms:
- See deployment guides in README.md
- Render, Vercel, Railway configs included

## ✅ Validation Checklist

Run this checklist to ensure everything works:

- [ ] Application starts successfully
- [ ] Can access frontend at localhost:5173
- [ ] Can access backend health at localhost:3001/health
- [ ] Can register a new account
- [ ] Can login as chef (chef@traphouse.com / chef123)
- [ ] Can browse menu as customer
- [ ] Can set allergen profile
- [ ] Allergen warnings appear correctly
- [ ] Can add items to cart
- [ ] Can place an order
- [ ] Chef can view orders
- [ ] Chef can create new dishes
- [ ] Can submit dish requests
- [ ] Can vote on dish requests
- [ ] Database persists after restart

## 🎉 You're All Set!

The application is now ready for:
- ✅ Development and testing
- ✅ Customer demonstration
- ✅ Feature additions
- ✅ Production deployment

**Happy coding! 🚀**

---

**Need Help?**
- Check the [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions
- Review [README.md](README.md) for complete documentation
- Run `./validate-setup.sh` to check your configuration

