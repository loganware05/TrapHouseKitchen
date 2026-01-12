# 🚀 Render Quick Start - TrapHouse Kitchen

**Get your app live in 30 minutes!**

---

## 📍 **You Are Here**

✅ Application fully built and tested  
✅ All Phase 1 features complete  
✅ Deployment files created  
🔄 **Next: Deploy to Render**

---

## 🎯 **3-Step Deployment Process**

### **Step 1: Push to GitHub** (5 minutes)

```bash
# Open terminal in your project directory
cd "/Users/loganware/Documents/Buisness/TrapHouseKitchen v2"

# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Ready for production deployment"

# Create repository on GitHub.com:
# 1. Go to github.com/new
# 2. Name it "traphouse-kitchen"
# 3. Choose Private or Public
# 4. DON'T initialize with README
# 5. Click "Create repository"

# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/traphouse-kitchen.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**✅ Checkpoint:** Code should now be visible on GitHub

---

### **Step 2: Deploy on Render** (15 minutes)

#### **2.1 Sign Up for Render**
1. Go to [render.com](https://render.com)
2. Click "Get Started"
3. **Sign up with GitHub** (easiest option)
4. Authorize Render to access your repositories

#### **2.2 Create Blueprint**
1. Click "New +" in top right
2. Select **"Blueprint"**
3. Select your repository: `traphouse-kitchen`
4. Render detects `render.yaml` automatically
5. Review 3 services:
   - `traphousekitchen-db` (Database)
   - `traphousekitchen-api` (Backend)
   - `traphousekitchen-web` (Frontend)
6. Click **"Create Services"**

#### **2.3 Wait for Services**
- Database: ~3-5 minutes (first)
- Backend: ~5-8 minutes (after database)
- Frontend: ~3-5 minutes (simultaneous with backend)

**Total wait:** ~10-15 minutes

#### **2.4 Configure Environment Variables**

**For Backend API** (`traphousekitchen-api`):
1. Click service name
2. Go to "Environment" tab
3. Add these variables:

```bash
STRIPE_SECRET_KEY=sk_test_51SnsOx3HCUaM188qwpBK9zvESnLC90yMKJ7wjJZwiBS8hHSrNoikkFQNR6TUOiElUTrWwn9ixDG1eUkMScYRbzkk00B0wVWQ4X
STRIPE_PUBLISHABLE_KEY=pk_test_51SnsOx3HCUaM188qLbde2oBvZ5eB5wPghf62WkSfVWI41kYL9NJy14BtkO5EP07c82Oa8cQHS0Vlyr79uPv9STfk00LiO2sBhv
CHEF_EMAIL=your-email@example.com
```

**Optional (for emails):**
```bash
RESEND_API_KEY=re_your_key_here
FROM_EMAIL=TrapHouse Kitchen <orders@yourdomain.com>
```

4. Click "Save Changes"
5. Backend will redeploy automatically

**For Frontend** (`traphousekitchen-web`):
1. Click service name
2. Go to "Environment" tab
3. Add:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SnsOx3HCUaM188qLbde2oBvZ5eB5wPghf62WkSfVWI41kYL9NJy14BtkO5EP07c82Oa8cQHS0Vlyr79uPv9STfk00LiO2sBhv
```

4. Click "Save Changes"

**✅ Checkpoint:** All services should show "Live" status

---

### **Step 3: Verify & Test** (10 minutes)

#### **3.1 Get Your URLs**

In Render dashboard, note your URLs:
- **Frontend:** `https://traphousekitchen-web.onrender.com`
- **Backend:** `https://traphousekitchen-api.onrender.com`

#### **3.2 Health Check**

Test backend:
```bash
# Visit in browser or curl
https://YOUR-BACKEND-URL.onrender.com/health

# Should return:
{"status":"ok","timestamp":"2026-01-12T..."}
```

#### **3.3 Test Core Features**

1. **Frontend loads:**
   - Visit: `https://YOUR-FRONTEND-URL.onrender.com`
   - Should see homepage ✅

2. **Chef login:**
   - Go to: `/chef/login`
   - Email: `chef@traphouse.com`
   - Password: `chef123`
   - Should reach dashboard ✅

3. **Customer registration:**
   - Register new account
   - Should create successfully ✅

4. **Menu & ordering:**
   - View menu
   - Add item to cart
   - Proceed to checkout ✅

5. **Test payment:**
   - Use card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - Should complete successfully ✅

**✅ Checkpoint:** If all tests pass, you're LIVE! 🎉

---

## 🎉 **You're Live!**

### **Your Production URLs:**

```
Frontend: https://traphousekitchen-web.onrender.com
Backend:  https://traphousekitchen-api.onrender.com
```

### **Share & Test:**
1. Open frontend URL in browser
2. Test on mobile device
3. Share with team for testing
4. Create QR code for restaurant

---

## 🔧 **Common Issues & Quick Fixes**

### **Issue: Backend deploy failed**
```
Fix:
1. Go to service → Logs
2. Look for error (often missing env var)
3. Add missing variable
4. Redeploy
```

### **Issue: Frontend shows "API Error"**
```
Fix:
1. Check backend is Live
2. Verify VITE_API_URL is set
3. Check browser console for CORS errors
```

### **Issue: "Cannot find module @prisma/client"**
```
Fix:
1. Go to backend service → Shell
2. Run: cd backend && npx prisma generate
3. Restart service
```

### **Issue: Database connection failed**
```
Fix:
1. Check database service is Available
2. Verify DATABASE_URL is set in backend
3. Check database wasn't paused (free tier)
```

### **Issue: First request takes 30-60 seconds**
```
This is normal:
- Free tier services "sleep" after inactivity
- First request "wakes up" the service
- Upgrade to Starter plan ($7/month) to eliminate cold starts
```

---

## 💡 **Pro Tips**

### **Auto-Deploy**
Every time you push to GitHub, Render automatically deploys:
```bash
git add .
git commit -m "New feature"
git push origin main
# Render deploys automatically!
```

### **View Logs**
Monitor your app in real-time:
1. Go to service in Render dashboard
2. Click "Logs" tab
3. See live application logs

### **Manual Redeploy**
If needed:
1. Go to service
2. Click "Manual Deploy" → "Deploy latest commit"

### **Database Backups**
Automatic on Render:
- Daily backups
- 7-day retention (Starter plan)
- Manual backup option available

---

## 📚 **Documentation Reference**

Created for you:

1. **`RENDER_DEPLOYMENT_GUIDE.md`**
   - Complete step-by-step guide
   - Troubleshooting section
   - Custom domain setup

2. **`ENVIRONMENT_VARIABLES.md`**
   - All environment variables explained
   - Security best practices
   - How to generate secure values

3. **`GITHUB_SETUP.md`**
   - GitHub repository setup
   - Git commands reference
   - SSH key setup

4. **`DEPLOYMENT_CHECKLIST.md`**
   - Pre-deployment checklist
   - Post-deployment verification
   - Go-live checklist

---

## 🆘 **Need Help?**

### **For Deployment Issues:**
1. Check service logs in Render dashboard
2. Review `RENDER_DEPLOYMENT_GUIDE.md` troubleshooting
3. Search [community.render.com](https://community.render.com)
4. Contact support@render.com

### **For Application Issues:**
1. Check browser console (F12)
2. Review backend logs
3. Verify environment variables
4. Check `PRODUCTION_READY.md` for features

---

## 🎯 **Next Steps After Deployment**

### **Immediate (Today):**
- [ ] Test all features thoroughly
- [ ] Share URLs with team
- [ ] Create QR code for restaurant
- [ ] Add payment method to Render (for after free trial)

### **This Week:**
- [ ] Test on various devices/browsers
- [ ] Gather initial feedback
- [ ] Monitor logs daily
- [ ] Set up custom domain (optional)

### **Before Going Live:**
- [ ] Switch Stripe to live mode
- [ ] Update Stripe keys in Render
- [ ] Test with real (small) payment
- [ ] Brief restaurant staff
- [ ] Create user guide

### **Ongoing:**
- [ ] Monitor performance
- [ ] Respond to issues quickly
- [ ] Gather customer feedback
- [ ] Plan feature improvements
- [ ] Scale as needed

---

## 💰 **Billing Reminder**

**Free Trial:**
- 90 days free for PostgreSQL
- 750 hours/month free for web services

**After Trial:**
- PostgreSQL: $7/month
- Backend API: $7/month
- Frontend: Free forever
- **Total: $14/month**

**Add payment method NOW** to avoid service interruption after free trial.

---

## ✅ **Deployment Complete!**

**Congratulations! 🎊**

Your TrapHouse Kitchen application is now live and accessible worldwide!

**Production URLs:**
```
🌐 Frontend: https://traphousekitchen-web.onrender.com
🔌 Backend:  https://traphousekitchen-api.onrender.com
```

**Test Credentials:**
```
👨‍🍳 Chef Login:
   Email: chef@traphouse.com
   Password: chef123

🧪 Test Payment:
   Card: 4242 4242 4242 4242
   Expiry: Any future date
   CVC: Any 3 digits
```

**Start accepting orders! 🍽️**
