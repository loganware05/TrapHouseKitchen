# 🔍 Render Build Issues - Debug Checklist

Let's debug your build issues step by step!

---

## 📋 **Step 1: Share the Error Logs**

Please copy the error messages from Render and we'll diagnose them together.

### **How to Get Logs:**

**For Backend API:**
1. Dashboard → `traphousekitchen-api`
2. Click "Logs" tab (left sidebar)
3. Look for red error messages
4. Copy the full error output

**For Frontend:**
1. Dashboard → `traphousekitchen-web`
2. Click "Logs" tab
3. Look for build failures
4. Copy the error output

---

## 🔧 **Common Build Issues & Quick Fixes**

### **Issue 1: Backend Build Fails - "Cannot find module '@prisma/client'"**

**Error looks like:**
```
Error: Cannot find module '@prisma/client'
    at Function.Module._resolveFilename
```

**Cause:** Prisma client not generated during build

**Fix:**

**Option A: Update Build Command**
1. Backend → Settings
2. Find "Build Command"
3. Change to:
   ```bash
   cd backend && npm ci && npx prisma generate && npm run build
   ```
4. Save and trigger manual deploy

**Option B: Use Shell**
1. Backend → Shell
2. Run:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npm run build
   ```

---

### **Issue 2: Backend Build Fails - "DATABASE_URL is not defined"**

**Error looks like:**
```
Error: Environment variable not found: DATABASE_URL
```

**Cause:** DATABASE_URL not set in environment variables

**Fix:**
1. Backend → Environment
2. Check if `DATABASE_URL` exists
3. Value should be:
   ```
   postgresql://traphouse_kitchen_user:yC2CUn8OXyDbyGTlbjganix9JDQSfbcJ@dpg-d5it5l8gjchc73comu1g-a/traphouse_kitchen
   ```
4. Save changes
5. Redeploy

---

### **Issue 3: Backend Build Fails - "npm ERR! code ERESOLVE"**

**Error looks like:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Cause:** Dependency conflicts

**Fix: Use `npm ci` instead of `npm install`**
1. Backend → Settings
2. Build Command:
   ```bash
   cd backend && npm ci --legacy-peer-deps && npx prisma generate && npm run build
   ```
3. Save and redeploy

---

### **Issue 4: Frontend Build Fails - "VITE_API_URL is not defined"**

**Error looks like:**
```
[vite] error during build:
VITE_API_URL is undefined
```

**Cause:** Environment variable not set or not prefixed correctly

**Fix:**
1. Frontend → Environment
2. Add:
   ```bash
   VITE_API_URL=https://traphousekitchen-api.onrender.com/api
   ```
3. **Important:** Must be prefixed with `VITE_`
4. Save and redeploy

---

### **Issue 5: Frontend Build Fails - "Cannot find module './App'"**

**Error looks like:**
```
Error: Cannot find module './App'
    at /app/frontend/src/main.tsx
```

**Cause:** TypeScript compilation errors

**Fix:**
1. Check your local build works:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. If it works locally, check case sensitivity
3. Ensure all imports match file names exactly

---

### **Issue 6: Backend Crashes After Deploy - "Connection terminated unexpectedly"**

**Error looks like:**
```
Connection terminated unexpectedly
    at Connection.parseE
```

**Cause:** Database connection issue

**Fix:**
1. Verify DATABASE_URL format:
   ```
   postgresql://USER:PASSWORD@HOST/DATABASE
   ```
2. Check database is "Available"
3. Try internal vs external URL (use internal)
4. Ensure no extra spaces in DATABASE_URL

---

### **Issue 7: Build Succeeds But App Crashes - "PORT is not defined"**

**Error looks like:**
```
Error: PORT environment variable is required
```

**Fix:**
1. Backend → Environment
2. Add:
   ```bash
   PORT=10000
   ```
3. Save and redeploy

---

### **Issue 8: Frontend Builds But Shows Blank Page**

**Symptoms:**
- Build succeeds
- Deployment shows "Live"
- Page loads but is blank

**Fix:**

**Check 1: Publish Directory**
1. Frontend → Settings
2. "Publish Directory" should be: `frontend/dist`
3. Not `dist` or `build`

**Check 2: Routes Configuration**
1. Frontend → Settings → Redirects/Rewrites
2. Add rewrite rule:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: Rewrite

---

## 🔍 **Detailed Debugging Steps**

### **Step 1: Verify Build Commands**

**Backend Build Command should be:**
```bash
cd backend && npm ci && npx prisma generate && npm run build
```

**Backend Start Command should be:**
```bash
cd backend && npx prisma migrate deploy && npm start
```

**Frontend Build Command should be:**
```bash
cd frontend && npm ci && npm run build
```

---

### **Step 2: Check All Environment Variables**

**Backend Environment (traphousekitchen-api):**
```bash
# Required
DATABASE_URL=postgresql://traphouse_kitchen_user:yC2CUn8OXyDbyGTlbjganix9JDQSfbcJ@dpg-d5it5l8gjchc73comu1g-a/traphouse_kitchen
NODE_ENV=production
PORT=10000
JWT_SECRET=<should be auto-generated>
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_test_51SnsOx3HCUaM188qwpBK9zvESnLC90yMKJ7wjJZwiBS8hHSrNoikkFQNR6TUOiElUTrWwn9ixDG1eUkMScYRbzkk00B0wVWQ4X
STRIPE_PUBLISHABLE_KEY=pk_test_51SnsOx3HCUaM188qLbde2oBvZ5eB5wPghf62WkSfVWI41kYL9NJy14BtkO5EP07c82Oa8cQHS0Vlyr79uPv9STfk00LiO2sBhv

# Add after frontend is deployed
FRONTEND_URL=<your frontend URL>

# Optional
RESEND_API_KEY=<your key>
CHEF_EMAIL=<your email>
FROM_EMAIL=TrapHouse Kitchen <orders@traphousekitchen.com>
```

**Frontend Environment (traphousekitchen-web):**
```bash
# Required (must have VITE_ prefix!)
VITE_API_URL=<your backend URL>/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SnsOx3HCUaM188qLbde2oBvZ5eB5wPghf62WkSfVWI41kYL9NJy14BtkO5EP07c82Oa8cQHS0Vlyr79uPv9STfk00LiO2sBhv
```

---

### **Step 3: Check Service Configuration**

**Backend Settings:**
```
Name:               traphousekitchen-api
Region:             Oregon (US West)
Branch:             main
Root Directory:     (blank)
Environment:        Node
Build Command:      cd backend && npm ci && npx prisma generate && npm run build
Start Command:      cd backend && npx prisma migrate deploy && npm start
Auto-Deploy:        Yes
Health Check Path:  /health
```

**Frontend Settings:**
```
Name:               traphousekitchen-web
Region:             Oregon (US West)
Branch:             main
Root Directory:     (blank)
Build Command:      cd frontend && npm ci && npm run build
Publish Directory:  frontend/dist
Auto-Deploy:        Yes
```

---

## 📝 **Share This Information for Debugging**

Please share the following so I can help you debug:

### **1. Error Logs**
Copy the full error from Render logs (backend and/or frontend)

### **2. Current Build Commands**
What's currently set in:
- Backend build command
- Backend start command
- Frontend build command

### **3. Environment Variables**
List of all environment variables set (not the values, just the keys):
- Backend: DATABASE_URL, JWT_SECRET, etc.
- Frontend: VITE_API_URL, etc.

### **4. Service Status**
- Database: Available / Failed?
- Backend: Live / Failed?
- Frontend: Live / Failed?

---

## 🔧 **Quick Fixes to Try First**

### **Quick Fix 1: Rebuild with Clean Cache**

1. **Backend:**
   - Settings → scroll down
   - Click "Manual Deploy"
   - Select "Clear build cache & deploy"

2. **Frontend:**
   - Settings → scroll down
   - Click "Manual Deploy"
   - Select "Clear build cache & deploy"

### **Quick Fix 2: Update Build Commands**

**Backend:**
```bash
cd backend && npm ci --legacy-peer-deps && npx prisma generate && npm run build
```

**Frontend:**
```bash
cd frontend && npm ci --legacy-peer-deps && npm run build
```

### **Quick Fix 3: Test Local Build**

Verify it builds locally first:

```bash
# Test backend
cd backend
npm install
npx prisma generate
npm run build
# Should create dist/ folder

# Test frontend
cd frontend
npm install
npm run build
# Should create dist/ folder
```

If local build fails, fix those errors first before deploying!

---

## 💡 **Most Common Issue: Prisma Client**

**This is the #1 issue with Render deployments!**

**Symptoms:**
- Build succeeds but app crashes
- Error: "Cannot find module '@prisma/client'"
- Database connection errors

**The Fix:**
1. Backend → Shell
2. Run these commands:
   ```bash
   cd backend
   
   # Clear any old builds
   rm -rf node_modules dist
   
   # Reinstall
   npm install
   
   # Generate Prisma client
   npx prisma generate
   
   # Build TypeScript
   npm run build
   
   # Test that it works
   npm start
   ```

3. If that works, update your Build Command to:
   ```bash
   cd backend && rm -rf node_modules/.prisma && npm ci && npx prisma generate && npm run build
   ```

---

## 📞 **Next Steps**

**Share the following and I'll help you debug:**

1. **Copy the error logs** from Render (backend and/or frontend)
2. **Screenshot or copy** your current build commands
3. **List** your environment variables (keys only)
4. **Tell me** which service is failing (database, backend, or frontend)

Then I can give you specific fixes for your exact issue! 🚀

---

**Don't worry - build issues are normal on first deployment!** We'll get this fixed together. 💪
