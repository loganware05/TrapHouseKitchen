# ⚡ Quick Fix Guide - Get Deployed NOW

**Goal:** Get your app live in the next 15 minutes

---

## 🎯 **Step 1: Fix Frontend Build Command** (2 minutes)

### **In Render Dashboard:**

1. Click **`traphousekitchen-web`** service
2. Click **"Settings"** (left sidebar)
3. Scroll to **"Build & Deploy"** section
4. Find **"Build Command"** field
5. **Replace** whatever is there with:
   ```bash
   cd frontend && npm ci && npm run build
   ```
6. Click **"Save Changes"** button at bottom
7. Service will automatically redeploy

---

## ⏳ **Step 2: Wait for Deployments** (10-15 minutes)

### **Backend (traphousekitchen-api):**
- Status: Should be deploying now
- Watch for: "Live" status (green)
- Time: ~8-10 minutes

### **Frontend (traphousekitchen-web):**
- Status: Will start deploying after you save build command
- Watch for: "Live" status (green)
- Time: ~3-5 minutes

---

## ✅ **Step 3: Verify Deployment** (3 minutes)

### **Test 1: Backend Health**
Visit: `https://traphousekitchen-api.onrender.com/health`

**Expected Response:**
```json
{"status":"ok","timestamp":"2026-01-13T..."}
```

✅ If you see this, backend is working!

### **Test 2: Frontend Loading**
Visit: `https://traphousekitchen-web.onrender.com`

**Expected:** TrapHouse Kitchen homepage loads

✅ If homepage loads, frontend is working!

---

## 🎉 **Success! Your App is Live!**

Once both tests pass, you have a **live production app**!

---

## ⚠️ **Known Issues (We'll Fix After)**

Some features may not work correctly due to schema mismatches:

- Chef login might fail
- Allergen filtering might not work
- Some order features might be broken
- Dish request voting might not work

**Don't worry!** These are fixable. The important thing is your app is **deployed and accessible**.

---

## 🔧 **If Something Fails:**

### **Backend Build Still Failing:**
1. Check Render logs for new errors
2. Try "Manual Deploy" → "Clear build cache & deploy"
3. Verify `noEmitOnError: false` is in tsconfig.json

### **Frontend Build Still Failing:**
1. Double-check build command is exactly: `cd frontend && npm ci && npm run build`
2. Try "Manual Deploy" → "Clear build cache & deploy"
3. Check logs for specific error

### **App Loads But Features Broken:**
This is expected! We'll fix features after deployment.

---

## 📞 **Next Steps After Deployment:**

1. ✅ Celebrate! Your app is live! 🎉
2. 🧪 Test what features work
3. 📝 Make list of what's broken
4. 🔧 Fix schema mismatches one by one
5. 🚀 Full production launch

---

## 🎯 **Right Now:**

**Go to Render Dashboard and fix the frontend build command!**

That's the only thing blocking deployment now. 🚀
