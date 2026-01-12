# TrapHouse Kitchen - Testing Guide

## ✅ All Services Running Successfully

### 🗄️ PostgreSQL Database
- **Status:** ✅ Running and Healthy
- **Container:** `traphouse-postgres`
- **Port:** 5432
- **Database:** `traphouse_kitchen`
- **Credentials:** See backend/.env

### 🔧 Backend API
- **Status:** ✅ Running
- **URL:** http://localhost:3001
- **Health Check:** http://localhost:3001/health
- **Prisma Client:** ✅ Generated and Connected

### 🎨 Frontend Application
- **Status:** ✅ Running
- **URL:** http://localhost:5173
- **Hot Reload:** ✅ Enabled

---

## 🔗 Application Access Links

### **Customer Experience**
- **Homepage:** [http://localhost:5173](http://localhost:5173)
- **Menu:** [http://localhost:5173/menu](http://localhost:5173/menu)
- **Customer Login:** [http://localhost:5173/login](http://localhost:5173/login)
- **Register:** [http://localhost:5173/register](http://localhost:5173/register)
- **Dish Requests:** [http://localhost:5173/dish-requests](http://localhost:5173/dish-requests)

### **Chef Portal**
- **Chef Login:** [http://localhost:5173/chef/login](http://localhost:5173/chef/login)
- **Chef Dashboard:** [http://localhost:5173/chef](http://localhost:5173/chef) (requires login)
- **Manage Menu:** [http://localhost:5173/chef/menu](http://localhost:5173/chef/menu) (requires login)
- **Manage Orders:** [http://localhost:5173/chef/orders](http://localhost:5173/chef/orders) (requires login)
- **Manage Ingredients:** [http://localhost:5173/chef/ingredients](http://localhost:5173/chef/ingredients) (requires login)

---

## 🔐 Default Chef Credentials

Use these credentials to log in to the Chef Portal:

```
Email: chef@traphouse.com
Password: chef123
```

> **Note:** These credentials are displayed on the Chef Login page for easy reference.

---

## 🧪 Testing Checklist

### ✅ Fixed Issues
1. ✅ **TypeScript Linting Errors** - All fixed
2. ✅ **PostgreSQL Connection** - Working
3. ✅ **Prisma Client Generation** - Successfully generated
4. ✅ **Chef Login Route** - Now available at `/chef/login`
5. ✅ **React Rendering** - Fixed navigation redirect issue

### 🧑‍🍳 Chef Dashboard Testing

1. **Login as Chef**
   - Go to [http://localhost:5173/chef/login](http://localhost:5173/chef/login)
   - Enter credentials: `chef@traphouse.com` / `chef123`
   - Should redirect to Chef Dashboard

2. **View Dashboard**
   - Should display:
     - Pending Orders count
     - Orders in Preparing status
     - Total Dishes count
     - Total Orders count
     - Top Dish Requests

3. **Add a Dish**
   - Click "Manage Menu" or go to [http://localhost:5173/chef/menu](http://localhost:5173/chef/menu)
   - Click "Add Dish" button
   - Fill in dish details (name, description, price, category)
   - Select ingredients and allergens
   - Save the dish

4. **View Orders**
   - Go to [http://localhost:5173/chef/orders](http://localhost:5173/chef/orders)
   - View all customer orders
   - Update order status (Pending → Preparing → Ready → Completed)

### 👥 Customer Experience Testing

1. **Browse Menu (No Login Required)**
   - Go to [http://localhost:5173/menu](http://localhost:5173/menu)
   - Browse available dishes (will be empty until chef adds dishes)

2. **Register as Customer**
   - Go to [http://localhost:5173/register](http://localhost:5173/register)
   - Create a new account

3. **Set Allergen Profile**
   - After login, go to Profile
   - Select your allergens
   - System will warn you about incompatible dishes

4. **Place an Order**
   - Add dishes to cart
   - Review cart
   - Place order
   - View order status

5. **Submit Dish Request**
   - Go to [http://localhost:5173/dish-requests](http://localhost:5173/dish-requests)
   - Submit a new dish idea
   - Vote on other requests

---

## 🐛 Troubleshooting

### If Chef Login Page is Blank

1. **Open Browser Developer Console** (F12)
   - Check for any JavaScript errors
   - Look for React rendering errors

2. **Check Network Tab**
   - Verify that `/src/main.tsx` is loading
   - Check if CSS files are loading

3. **Hard Refresh**
   - Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
   - This clears the cache and reloads all assets

4. **Check Terminal Output**
   - Look at the frontend terminal for any Vite errors
   - Look at the backend terminal for any API errors

### If Backend API is Not Responding

1. **Check Backend Terminal**
   - Read: `~/.cursor/projects/.../terminals/2.txt`
   - Look for error messages

2. **Verify Database Connection**
   ```bash
   docker ps | grep traphouse-postgres
   ```

3. **Regenerate Prisma Client**
   ```bash
   cd backend
   npx prisma generate
   npm run dev
   ```

### If Frontend Won't Load

1. **Check Frontend Terminal**
   - Read: `~/.cursor/projects/.../terminals/4.txt`
   - Look for Vite errors

2. **Reinstall Dependencies**
   ```bash
   cd frontend
   rm -rf node_modules
   npm install
   npm run dev
   ```

3. **Check Port Availability**
   ```bash
   lsof -ti:5173
   ```

---

## 📊 Database Seeded Data

### Categories (4)
1. Appetizers
2. Main Courses
3. Desserts
4. Beverages

### Allergens (8)
1. Peanuts (HIGH severity)
2. Dairy (MODERATE)
3. Gluten (MODERATE)
4. Shellfish (HIGH)
5. Eggs (MODERATE)
6. Soy (LOW)
7. Fish (HIGH)
8. Sesame (MODERATE)

### Users (1)
- Chef Account: `chef@traphouse.com`

### Dishes
- Currently empty - add via Chef Dashboard

---

## 🚀 Next Steps

1. **Log in as Chef** and add some dishes to the menu
2. **Create a customer account** and test ordering
3. **Submit dish requests** and test voting functionality
4. **Configure PWA** for mobile installation
5. **Generate QR Code** for easy mobile access
6. **Deploy to production** using AWS ECR

---

## 📝 API Endpoints for Testing

### Public Endpoints
- `GET /api/categories` - List all categories
- `GET /api/dishes` - List all available dishes
- `GET /api/allergens` - List all allergens
- `GET /api/dish-requests` - List all dish requests

### Protected Endpoints (Require Authentication)
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Get current user
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user's orders

### Chef-Only Endpoints
- `POST /api/dishes` - Create dish
- `PUT /api/dishes/:id` - Update dish
- `DELETE /api/dishes/:id` - Delete dish
- `GET /api/orders/all` - Get all orders
- `PATCH /api/orders/:id/status` - Update order status

---

## 🎯 Key Features to Test

1. **Role-Based Access Control**
   - Chefs can access /chef/* routes
   - Customers cannot access chef routes
   - Guest users have limited access

2. **Allergen Management**
   - Customer allergen profiles
   - Visual warnings on incompatible dishes
   - Blocking orders with allergen conflicts

3. **Dish Requests**
   - Reddit-style voting system
   - Public visibility
   - Chef can view popular requests

4. **Real-Time Updates**
   - Order status changes
   - Menu availability updates
   - Dish request vote counts

5. **Mobile-First Design**
   - Responsive layout
   - iOS safe areas
   - PWA capabilities

---

**Happy Testing! 🎉**

If you encounter any issues, check the troubleshooting section or review the terminal outputs.
