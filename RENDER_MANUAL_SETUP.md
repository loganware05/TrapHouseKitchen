# 🚀 Render Manual Setup - TrapHouse Kitchen

Since the Blueprint auto-detection has issues, here's the **manual setup approach** (actually easier!).

**Time:** 20 minutes  
**Difficulty:** Easy

---

## 📋 **Step-by-Step Manual Setup**

### **Step 1: Create PostgreSQL Database** (5 minutes)

1. **Go to Render Dashboard:**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Click "New +" in top right

2. **Select PostgreSQL:**
   - Click "PostgreSQL"

3. **Configure Database:**
   ```
   Name:     traphousekitchen-db
   Database: traphouse_kitchen
   User:     traphouse
   Region:   Oregon (US West)
   Plan:     Starter ($7/month, 90-day free trial)
   ```

4. **Create Database:**
   - Click "Create Database"
   - Wait 2-3 minutes for provisioning

5. **Copy Connection String:**
   - Once database is "Available"
   - Go to database → Info
   - Copy "Internal Database URL" (starts with `postgresql://`)
   - **SAVE THIS** - you'll need it for the backend

---

### **Step 2: Create Backend API** (7 minutes)

1. **Go to Render Dashboard:**
   - Click "New +" → "Web Service"

2. **Connect Repository:**
   - Click "Connect a repository"
   - Sign in with GitHub (if not already)
   - Select your `traphouse-kitchen` repository
   - Click "Connect"

3. **Configure Web Service:**
   ```
   Name:          traphousekitchen-api
   Region:        Oregon (US West)
   Branch:        main
   Root Directory: (leave blank)
   Runtime:       Node
   Build Command: cd backend && npm install && npx prisma generate && npm run build
   Start Command: cd backend && npx prisma migrate deploy && npm start
   Plan:          Starter ($7/month, 750 hours free/month)
   ```

4. **Add Environment Variables:**
   
   Click "Advanced" → "Add Environment Variable" and add these:

   **Required:**
   ```bash
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=<paste the connection string from Step 1>
   JWT_SECRET=<click "Generate" button>
   JWT_EXPIRES_IN=7d
   STRIPE_SECRET_KEY=sk_test_51SnsOx3HCUaM188qwpBK9zvESnLC90yMKJ7wjJZwiBS8hHSrNoikkFQNR6TUOiElUTrWwn9ixDG1eUkMScYRbzkk00B0wVWQ4X
   STRIPE_PUBLISHABLE_KEY=pk_test_51SnsOx3HCUaM188qLbde2oBvZ5eB5wPghf62WkSfVWI41kYL9NJy14BtkO5EP07c82Oa8cQHS0Vlyr79uPv9STfk00LiO2sBhv
   FRONTEND_URL=<we'll add this after Step 3>
   CHEF_EMAIL=your-email@example.com
   ```

   **Optional (for emails):**
   ```bash
   RESEND_API_KEY=re_your_key_here
   FROM_EMAIL=TrapHouse Kitchen <orders@yourdomain.com>
   ```

5. **Create Web Service:**
   - Scroll down
   - Click "Create Web Service"
   - Wait 5-8 minutes for deployment

6. **Copy Backend URL:**
   - Once deployed (status: "Live")
   - Copy the URL (e.g., `https://traphousekitchen-api.onrender.com`)
   - **SAVE THIS** - you'll need it for the frontend

---

### **Step 3: Create Frontend** (5 minutes)

1. **Go to Render Dashboard:**
   - Click "New +" → "Static Site"

2. **Connect Repository:**
   - Select your `traphouse-kitchen` repository
   - Click "Connect"

3. **Configure Static Site:**
   ```
   Name:                 traphousekitchen-web
   Region:               Oregon (US West)
   Branch:               main
   Root Directory:       (leave blank)
   Build Command:        cd frontend && npm install && npm run build
   Publish Directory:    frontend/dist
   Auto-Deploy:          Yes
   ```

4. **Add Environment Variables:**
   
   Click "Advanced" → "Add Environment Variable":

   ```bash
   VITE_API_URL=<paste backend URL from Step 2>/api
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SnsOx3HCUaM188qLbde2oBvZ5eB5wPghf62WkSfVWI41kYL9NJy14BtkO5EP07c82Oa8cQHS0Vlyr79uPv9STfk00LiO2sBhv
   ```

   **Example:**
   ```bash
   VITE_API_URL=https://traphousekitchen-api.onrender.com/api
   ```

5. **Create Static Site:**
   - Click "Create Static Site"
   - Wait 3-5 minutes for deployment

6. **Copy Frontend URL:**
   - Once deployed (status: "Live")
   - Copy the URL (e.g., `https://traphousekitchen-web.onrender.com`)

---

### **Step 4: Update Backend with Frontend URL** (2 minutes)

1. **Go to Backend Service:**
   - Dashboard → `traphousekitchen-api`

2. **Update Environment Variable:**
   - Go to "Environment" tab
   - Find `FRONTEND_URL`
   - Set value to your frontend URL (e.g., `https://traphousekitchen-web.onrender.com`)
   - Click "Save Changes"

3. **Wait for Redeploy:**
   - Backend will automatically redeploy (1-2 minutes)

---

## ✅ **Step 5: Verify Deployment**

### **5.1 Check All Services are Live:**

Go to Render Dashboard and verify:
- ✅ `traphousekitchen-db` - Status: Available
- ✅ `traphousekitchen-api` - Status: Live
- ✅ `traphousekitchen-web` - Status: Live

### **5.2 Test Backend Health:**

Visit in browser:
```
https://YOUR-BACKEND-URL.onrender.com/health
```

Should return:
```json
{"status":"ok","timestamp":"2026-01-12T..."}
```

### **5.3 Test Frontend:**

Visit in browser:
```
https://YOUR-FRONTEND-URL.onrender.com
```

Should see the TrapHouse Kitchen homepage! 🎉

---

## 🧪 **Step 6: Test Features**

### **Test Chef Login:**
1. Go to: `https://YOUR-FRONTEND-URL.onrender.com/chef/login`
2. Email: `chef@traphouse.com`
3. Password: `chef123`
4. Should login successfully ✅

**Note:** If chef login fails with "Invalid credentials", you need to seed the database:

**Seed Database:**
1. Go to backend service → "Shell" tab
2. Run:
   ```bash
   cd backend
   npx prisma db push
   npm run prisma:seed
   ```

**OR** connect to database and run the SQL:
1. Go to database service → "Connect"
2. Use the connection details
3. Run the SQL from `backend/prisma/seed.sql`

### **Test Customer Registration:**
1. Go to: `/register`
2. Create a new account
3. Should register successfully ✅

### **Test Order Flow:**
1. Login as customer
2. Browse menu
3. Add item to cart
4. Go to checkout
5. Use test card: `4242 4242 4242 4242`
6. Complete payment
7. Should see order confirmation ✅

---

## 🎯 **Your Deployment URLs**

Once all steps are complete, you'll have:

```
Frontend:  https://traphousekitchen-web.onrender.com
Backend:   https://traphousekitchen-api.onrender.com
Database:  Internal connection only

Test Chef Login:
  Email:    chef@traphouse.com
  Password: chef123

Test Payment Card:
  Card:     4242 4242 4242 4242
  Expiry:   Any future date
  CVC:      Any 3 digits
```

---

## 🐛 **Troubleshooting**

### **Backend Deploy Fails:**

**Check Build Logs:**
1. Go to backend service → "Logs"
2. Look for errors

**Common Issues:**
- Missing environment variables → Add them
- Prisma client not generated → Should auto-generate in build command
- Database connection failed → Check DATABASE_URL is correct

**Fix:**
```bash
# In backend service Shell:
cd backend
npx prisma generate
npm run build
```

### **Frontend Shows API Errors:**

**Check:**
1. Is `VITE_API_URL` set correctly?
2. Does it end with `/api`?
3. Is backend service "Live"?

**Fix:**
1. Go to frontend → Environment
2. Update `VITE_API_URL` to include `/api` at the end
3. Save and redeploy

### **CORS Errors:**

**Check:**
1. Is `FRONTEND_URL` set in backend?
2. Does it match the actual frontend URL?

**Fix:**
1. Go to backend → Environment
2. Update `FRONTEND_URL` to exact frontend URL (no trailing slash)
3. Save and redeploy

### **Database Connection Error:**

**Check:**
1. Is database status "Available"?
2. Is `DATABASE_URL` correct?

**Fix:**
1. Go to database service
2. Copy "Internal Database URL"
3. Update `DATABASE_URL` in backend
4. Save and redeploy

### **Chef Login Fails:**

**Reason:** Database not seeded

**Fix:**
1. Go to backend service → Shell
2. Run:
   ```bash
   cd backend
   npm run prisma:seed
   ```

---

## 💰 **Pricing Summary**

```
PostgreSQL Database:  $7/month  (90-day free trial)
Backend API:          $7/month  (750 hours free/month)
Frontend Static:      FREE      (forever)
────────────────────────────────
Total:               $14/month  (after free trials)
```

---

## 🎉 **Deployment Complete!**

Your TrapHouse Kitchen is now live!

**Next Steps:**
1. ✅ Test all features thoroughly
2. ✅ Share URLs with your team
3. ✅ Create QR codes for restaurant
4. ✅ Add payment method to Render (for after free trial)
5. ✅ Monitor logs for first few days
6. ✅ Gather user feedback
7. ✅ Switch Stripe to live mode when ready

**Questions?** Check the other guides or reach out to Render support!

---

## 📞 **Support Resources**

- **Render Docs:** [render.com/docs](https://render.com/docs)
- **Render Community:** [community.render.com](https://community.render.com)
- **Render Support:** support@render.com
- **Stripe Docs:** [stripe.com/docs](https://stripe.com/docs)

**Ready to accept real orders! 🍽️**
