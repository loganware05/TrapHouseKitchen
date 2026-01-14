# 🔗 Connecting Your Render Services

You've created all 3 services! Now let's connect them together.

---

## 📋 **Current Status:**

- ✅ PostgreSQL Database (`traphousekitchen-db`)
- ✅ Backend API (`traphousekitchen-api`)
- ✅ Frontend Static Site (`traphousekitchen-web`)

**Next:** Link them together with environment variables

---

## 🔧 **Step 1: Get Database Connection String**

1. **Go to Database Service:**
   - Dashboard → `traphousekitchen-db`
   - Click on the database name

2. **Copy Connection String:**
   - Go to "Info" or "Connect" tab
   - Look for "Internal Database URL"
   - Copy the entire string (starts with `postgresql://`)
   
   Example format:
   ```
   postgresql://traphouse:PASSWORD@dpg-xxxxx-a.oregon-postgres.render.com/traphouse_kitchen
   ```

**✏️ PASTE IT HERE:** (for your reference)
```
DATABASE_URL=
```

---

## 🔧 **Step 2: Configure Backend API Environment Variables**

1. **Go to Backend Service:**
   - Dashboard → `traphousekitchen-api`
   - Click "Environment" tab (left sidebar)

2. **Check/Add These Variables:**

### **Database Connection:**
```bash
DATABASE_URL=<paste the connection string from Step 1>
```

### **Authentication:**
```bash
JWT_SECRET=<click "Generate" to create a random value>
JWT_EXPIRES_IN=7d
```

### **Server Configuration:**
```bash
NODE_ENV=production
PORT=10000
```

### **Stripe Configuration:**
```bash
STRIPE_SECRET_KEY=sk_test_51SnsOx3HCUaM188qwpBK9zvESnLC90yMKJ7wjJZwiBS8hHSrNoikkFQNR6TUOiElUTrWwn9ixDG1eUkMScYRbzkk00B0wVWQ4X
STRIPE_PUBLISHABLE_KEY=pk_test_51SnsOx3HCUaM188qLbde2oBvZ5eB5wPghf62WkSfVWI41kYL9NJy14BtkO5EP07c82Oa8cQHS0Vlyr79uPv9STfk00LiO2sBhv
```

### **Email Configuration (Optional):**
```bash
RESEND_API_KEY=<your Resend key if you have one>
FROM_EMAIL=TrapHouse Kitchen <orders@traphousekitchen.com>
CHEF_EMAIL=<your email for order notifications>
```

### **FRONTEND_URL (we'll add this after Step 3):**
```bash
FRONTEND_URL=<leave blank for now>
```

3. **Save Changes:**
   - Click "Save Changes" button
   - Backend will automatically redeploy (takes 3-5 minutes)

---

## 🔧 **Step 3: Get Backend URL**

1. **Wait for Backend to Deploy:**
   - Dashboard → `traphousekitchen-api`
   - Wait until status shows "Live" (green)

2. **Copy Backend URL:**
   - At the top of the service page
   - Copy the URL (format: `https://traphousekitchen-api.onrender.com`)

**✏️ PASTE IT HERE:** (for your reference)
```
BACKEND_URL=
```

---

## 🔧 **Step 4: Configure Frontend Environment Variables**

1. **Go to Frontend Service:**
   - Dashboard → `traphousekitchen-web`
   - Click "Environment" tab

2. **Add These Variables:**

```bash
VITE_API_URL=<backend URL from Step 3>/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SnsOx3HCUaM188qLbde2oBvZ5eB5wPghf62WkSfVWI41kYL9NJy14BtkO5EP07c82Oa8cQHS0Vlyr79uPv9STfk00LiO2sBhv
```

**Example:**
```bash
VITE_API_URL=https://traphousekitchen-api.onrender.com/api
```

**⚠️ Important:** Make sure to include `/api` at the end!

3. **Save Changes:**
   - Click "Save Changes"
   - Frontend will redeploy (takes 2-3 minutes)

---

## 🔧 **Step 5: Update Backend with Frontend URL**

1. **Get Frontend URL:**
   - Dashboard → `traphousekitchen-web`
   - Wait for deployment to finish
   - Copy the URL (format: `https://traphousekitchen-web.onrender.com`)

2. **Update Backend:**
   - Dashboard → `traphousekitchen-api`
   - Go to "Environment" tab
   - Find `FRONTEND_URL` variable
   - Set value to: `<your frontend URL>`
   
   **Example:**
   ```bash
   FRONTEND_URL=https://traphousekitchen-web.onrender.com
   ```

3. **Save Changes:**
   - Backend will redeploy (takes 3-5 minutes)

---

## ✅ **Step 6: Seed Database**

Your database is empty! Let's add the initial data (chef account, categories, allergens).

### **Option A: Using Backend Shell (Easiest)**

1. **Go to Backend Service:**
   - Dashboard → `traphousekitchen-api`
   - Click "Shell" tab (left sidebar)

2. **Run These Commands:**
   ```bash
   cd backend
   
   # Push schema to database
   npx prisma db push
   
   # Seed database with initial data
   npm run prisma:seed
   ```

3. **Wait for Completion:**
   - Should see: "✅ Database seeded successfully!"
   - This creates:
     - Chef account (chef@traphouse.com / chef123)
     - 8 default allergens
     - 4 default categories

### **Option B: Using SQL (Alternative)**

If the shell doesn't work:

1. **Connect to Database:**
   - Dashboard → `traphousekitchen-db`
   - Click "Connect"
   - Use the connection details with a PostgreSQL client

2. **Run the SQL:**
   - Open: `backend/prisma/seed.sql`
   - Copy all the SQL
   - Execute in your database client

---

## 🧪 **Step 7: Test Your Deployment**

### **7.1 Test Backend Health**

Visit in browser:
```
https://YOUR-BACKEND-URL.onrender.com/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-13T..."
}
```

✅ If you see this, backend is working!

### **7.2 Test Frontend**

Visit in browser:
```
https://YOUR-FRONTEND-URL.onrender.com
```

**Expected:** TrapHouse Kitchen homepage loads

✅ If homepage loads, frontend is working!

### **7.3 Test Chef Login**

1. Go to: `https://YOUR-FRONTEND-URL.onrender.com/chef/login`
2. Email: `chef@traphouse.com`
3. Password: `chef123`
4. Click "Login"

**Expected:** Redirected to chef dashboard with stats

✅ If you see the dashboard, authentication is working!

### **7.4 Test Customer Registration**

1. Go to: `https://YOUR-FRONTEND-URL.onrender.com/register`
2. Fill in the form
3. Register a new account

**Expected:** Account created, logged in

✅ If registration works, full system is operational!

### **7.5 Test Order Flow**

1. **Login as customer** (from 7.4)
2. **Browse menu:** `/menu`
3. **Add item to cart**
4. **Go to checkout:** `/checkout`
5. **Use test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
6. **Complete payment**

**Expected:** Order confirmation page

✅ If payment processes, everything is working!

---

## 📊 **Deployment Summary**

Once all steps are complete:

### **Your URLs:**
```
Frontend:  https://traphousekitchen-web.onrender.com
Backend:   https://traphousekitchen-api.onrender.com
Database:  (internal only)
```

### **Test Credentials:**
```
Chef Login:
  Email:    chef@traphouse.com
  Password: chef123

Test Payment:
  Card:     4242 4242 4242 4242
  Expiry:   12/34
  CVC:      123
```

### **Service Status:**
- ✅ Database: Available
- ✅ Backend: Live
- ✅ Frontend: Live

---

## 🐛 **Troubleshooting Common Issues**

### **Backend Shows "Deploy Failed"**

**Check Logs:**
1. Dashboard → `traphousekitchen-api` → "Logs"
2. Look for error messages

**Common Causes:**
- Missing `DATABASE_URL` → Add it in Environment
- Prisma client not generated → Should auto-generate
- npm install failed → Check package.json

**Fix:**
```bash
# In backend Shell:
cd backend
npm install
npx prisma generate
npm run build
```

### **Frontend Shows "Failed to fetch" or API Errors**

**Check:**
1. Is `VITE_API_URL` set?
2. Does it end with `/api`?
3. Is backend service "Live"?

**Check Browser Console (F12):**
- Look for CORS errors
- Look for 404 errors

**Fix:**
1. Verify `VITE_API_URL=https://your-backend.onrender.com/api`
2. Verify `FRONTEND_URL` is set in backend
3. Redeploy both services

### **Chef Login Returns "Invalid Credentials"**

**Cause:** Database not seeded

**Fix:**
1. Backend → Shell
2. Run:
   ```bash
   cd backend
   npm run prisma:seed
   ```

### **CORS Error in Browser**

**Cause:** Backend doesn't recognize frontend URL

**Fix:**
1. Backend → Environment
2. Check `FRONTEND_URL` matches exactly (no trailing slash)
3. Example: `https://traphousekitchen-web.onrender.com`
4. Save and redeploy

### **Payment Fails with Stripe Error**

**Check:**
1. Is `STRIPE_SECRET_KEY` set in backend?
2. Is `VITE_STRIPE_PUBLISHABLE_KEY` set in frontend?
3. Do the keys match (both test or both live)?

**Fix:**
1. Verify keys in Stripe Dashboard
2. Update environment variables
3. Redeploy services

---

## 🎉 **Success Checklist**

Mark these off as you complete them:

- [ ] Database connection string copied
- [ ] Backend environment variables configured
- [ ] Backend deployed successfully
- [ ] Frontend environment variables configured
- [ ] Frontend deployed successfully
- [ ] Backend URL added to frontend
- [ ] Frontend URL added to backend
- [ ] Database seeded with initial data
- [ ] Backend health check responds
- [ ] Frontend homepage loads
- [ ] Chef can login
- [ ] Customer can register
- [ ] Menu displays dishes
- [ ] Can add items to cart
- [ ] Checkout page loads
- [ ] Test payment processes
- [ ] Order confirmation displays

**All checked?** You're live! 🚀

---

## 📞 **Still Having Issues?**

1. **Check service logs** in Render dashboard
2. **Check browser console** (F12) for frontend errors
3. **Review environment variables** - most issues are here
4. **Contact Render Support:** support@render.com (very responsive!)

---

## 🎯 **Next Steps After Deployment**

Once everything is working:

1. **Test Thoroughly:**
   - Try all features
   - Test on mobile
   - Test different payment methods

2. **Share URLs:**
   - Share with your team
   - Create QR codes
   - Test with real users

3. **Add Payment Method:**
   - Render → Account Settings → Billing
   - Add credit card for after free trial

4. **Monitor:**
   - Check logs daily
   - Watch for errors
   - Gather user feedback

5. **Go Live:**
   - Switch Stripe to live mode
   - Update Stripe keys
   - Start accepting real orders!

---

**Congratulations on deploying TrapHouse Kitchen! 🍽️**
