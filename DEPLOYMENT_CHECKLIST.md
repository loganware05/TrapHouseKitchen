# ✅ Deployment Checklist - TrapHouse Kitchen

Use this checklist to ensure a smooth deployment to Render.

---

## 📦 **Pre-Deployment (Before You Start)**

### **Code Preparation**
- [ ] All Phase 1 features implemented and tested
- [ ] All tests passing locally (15/15 tests)
- [ ] Backend builds successfully (`cd backend && npm run build`)
- [ ] Frontend builds successfully (`cd frontend && npm run build`)
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] All linting errors resolved

### **Environment Files**
- [ ] `.gitignore` includes `.env` files
- [ ] Created `backend/.env.example`
- [ ] Created `frontend/.env.example`
- [ ] All secret keys stored securely (not in git)

### **Configuration Files**
- [ ] `render.yaml` exists in project root
- [ ] `render.yaml` has correct service names
- [ ] Database connection configured
- [ ] CORS settings allow frontend domain

### **Documentation**
- [ ] `README.md` updated with project info
- [ ] `RENDER_DEPLOYMENT_GUIDE.md` reviewed
- [ ] Environment variables documented
- [ ] API endpoints documented

---

## 🐙 **GitHub Setup**

### **Repository Creation**
- [ ] GitHub account created
- [ ] New repository created on GitHub
- [ ] Repository is accessible (correct permissions)
- [ ] Repository name noted for later

### **Code Push**
- [ ] Git initialized locally (`git init`)
- [ ] All files added (`git add .`)
- [ ] Initial commit made (`git commit -m "Initial commit"`)
- [ ] GitHub remote added (`git remote add origin ...`)
- [ ] Code pushed to GitHub (`git push -u origin main`)

### **Repository Verification**
- [ ] `render.yaml` visible on GitHub
- [ ] `backend/` directory present
- [ ] `frontend/` directory present
- [ ] `.env` files NOT present (should be ignored)
- [ ] `node_modules/` NOT present (should be ignored)
- [ ] All source files uploaded correctly

---

## 🚀 **Render Account Setup**

### **Account Creation**
- [ ] Signed up at [render.com](https://render.com)
- [ ] Email verified
- [ ] Connected GitHub account
- [ ] Authorized Render to access repositories

### **Billing Information**
- [ ] Payment method added (for after free trial)
- [ ] Billing address entered
- [ ] Plan selected (Starter recommended: $14/month)

---

## 🔧 **Render Deployment**

### **Blueprint Creation**
- [ ] Clicked "New +" → "Blueprint"
- [ ] Selected correct GitHub repository
- [ ] Render detected `render.yaml`
- [ ] Reviewed 3 services to be created:
  - [ ] PostgreSQL database
  - [ ] Backend API
  - [ ] Frontend static site
- [ ] Clicked "Create Services"

### **Service Creation Progress**
- [ ] Database service created (status: Available)
- [ ] Backend service created (status: Live)
- [ ] Frontend service created (status: Live)
- [ ] No creation errors

---

## 🔐 **Environment Variables Configuration**

### **Backend API Variables**
Go to `traphousekitchen-api` → Environment

**Required:**
- [ ] `STRIPE_SECRET_KEY` (from Stripe dashboard)
- [ ] `STRIPE_PUBLISHABLE_KEY` (from Stripe dashboard)
- [ ] `CHEF_EMAIL` (your email for notifications)

**Optional but Recommended:**
- [ ] `RESEND_API_KEY` (for email notifications)
- [ ] `FROM_EMAIL` (email sender address)

**Auto-Configured (verify they exist):**
- [ ] `DATABASE_URL`
- [ ] `FRONTEND_URL`
- [ ] `NODE_ENV=production`
- [ ] `PORT`
- [ ] `JWT_SECRET`
- [ ] `JWT_EXPIRES_IN=7d`

### **Frontend Variables**
Go to `traphousekitchen-web` → Environment

**Required:**
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` (same as backend)

**Auto-Configured (verify):**
- [ ] `VITE_API_URL`

### **Variable Verification**
- [ ] All required variables set
- [ ] No typos in variable names
- [ ] No extra spaces in values
- [ ] Stripe keys match (test or live)
- [ ] Services redeployed after adding variables

---

## 🗄️ **Database Setup**

### **Database Service**
- [ ] PostgreSQL service status: Available
- [ ] Connection string generated
- [ ] Database name correct: `traphouse_kitchen`

### **Schema & Data**
- [ ] Backend ran migrations automatically (`prisma migrate deploy`)
- [ ] Database tables created
- [ ] Seed data loaded (optional)

### **Database Verification**
- [ ] Can connect to database
- [ ] Tables exist (`User`, `Dish`, `Order`, etc.)
- [ ] Default chef account exists (if seeded)
- [ ] Categories and allergens loaded (if seeded)

---

## ✅ **Deployment Verification**

### **Service Status**
- [ ] All 3 services show "Live" or "Available" status
- [ ] No deployment errors in logs
- [ ] Build logs show successful completion

### **Backend Health Check**
- [ ] Visit: `https://your-backend-url.onrender.com/health`
- [ ] Response: `{"status":"ok","timestamp":"..."}`
- [ ] Response time reasonable (< 5 seconds)

### **Frontend Loading**
- [ ] Visit: `https://your-frontend-url.onrender.com`
- [ ] Homepage loads successfully
- [ ] No console errors (check browser DevTools)
- [ ] Styles load correctly
- [ ] Images load (if any)

### **API Connectivity**
- [ ] Frontend can reach backend API
- [ ] No CORS errors in browser console
- [ ] Network tab shows API calls succeeding

---

## 🧪 **Feature Testing**

### **Authentication**
- [ ] Can access login page (`/login`)
- [ ] Can access registration page (`/register`)
- [ ] Can register new customer account
- [ ] Can login as customer
- [ ] Can access chef login (`/chef/login`)
- [ ] Can login as chef (email: `chef@traphouse.com`, password: `chef123`)
- [ ] JWT token stored correctly
- [ ] Protected routes require authentication

### **Customer Features**
- [ ] Can view menu (`/menu`)
- [ ] Dishes load correctly
- [ ] Can view dish details
- [ ] Can add items to cart
- [ ] Cart persists across pages
- [ ] Can update cart quantities
- [ ] Can remove items from cart
- [ ] Can proceed to checkout
- [ ] Checkout page loads

### **Chef Features**
- [ ] Chef dashboard loads (`/chef`)
- [ ] Stats cards display correctly
- [ ] Can view menu management (`/chef/menu`)
- [ ] Can create new dish
- [ ] Can edit existing dish
- [ ] Can delete dish
- [ ] Can view orders (`/chef/orders`)
- [ ] Can update order status
- [ ] Can view ingredients (`/chef/ingredients`)

### **Payment System**
- [ ] Checkout page displays Stripe Elements
- [ ] Can enter test card: `4242 4242 4242 4242`
- [ ] Can complete payment
- [ ] Order created successfully
- [ ] Payment intent created
- [ ] Payment confirmation shown
- [ ] Redirected to order confirmation page
- [ ] Order appears in orders list
- [ ] Cash on Pickup option works

### **Email Notifications** (if configured)
- [ ] Order confirmation email sent
- [ ] Order status update email sent
- [ ] Emails formatted correctly
- [ ] Links in emails work

### **Additional Features**
- [ ] Privacy Policy page loads (`/privacy`)
- [ ] Terms of Service page loads (`/terms`)
- [ ] Profile page loads (`/profile`)
- [ ] Can update allergen preferences
- [ ] Dish requests page works (`/dish-requests`)
- [ ] Can vote on dish requests
- [ ] Rate limiting works (try rapid requests)
- [ ] Error boundary catches errors (force an error to test)

---

## 🌐 **Custom Domain** (Optional)

If setting up custom domain:

### **Frontend Domain**
- [ ] Domain purchased/available
- [ ] Added to Render frontend service
- [ ] DNS records configured correctly
- [ ] SSL certificate provisioned (automatic)
- [ ] Domain resolves to Render
- [ ] HTTPS works

### **Backend Domain**
- [ ] API subdomain configured (e.g., `api.yourdomain.com`)
- [ ] Added to Render backend service
- [ ] DNS records configured
- [ ] SSL certificate provisioned
- [ ] API accessible via custom domain

### **Environment Variable Updates**
- [ ] `FRONTEND_URL` updated in backend
- [ ] `VITE_API_URL` updated in frontend
- [ ] Services redeployed after changes
- [ ] CORS still working with new domains

---

## 📊 **Monitoring Setup**

### **Render Dashboard**
- [ ] Can view all service logs
- [ ] Can view deployment history
- [ ] Can view metrics (CPU, memory, requests)
- [ ] Set up notification preferences

### **Alerts** (Recommended)
- [ ] Email notifications enabled
- [ ] Deploy failure alerts configured
- [ ] Service down alerts configured
- [ ] Resource limit alerts configured

### **External Monitoring** (Optional)
- [ ] Uptime monitoring set up (e.g., UptimeRobot)
- [ ] Error tracking configured (e.g., Sentry)
- [ ] Analytics installed (e.g., Google Analytics)

---

## 🔒 **Security Review**

### **API Security**
- [ ] Rate limiting active
- [ ] JWT secret is strong and random
- [ ] CORS configured correctly
- [ ] No secrets in logs
- [ ] Error messages don't expose sensitive info

### **Stripe Security**
- [ ] Using appropriate keys (test/live)
- [ ] Webhook signature verification enabled
- [ ] Stripe API key not exposed to frontend
- [ ] Payment intents properly secured

### **Database Security**
- [ ] Strong database password
- [ ] Connection string not exposed
- [ ] Database backups enabled
- [ ] Only backend can access database

### **Environment Variables**
- [ ] All secrets set in Render (not hardcoded)
- [ ] `.env` files not committed to git
- [ ] Production keys different from dev
- [ ] API keys have appropriate scopes/permissions

---

## 📝 **Documentation Updates**

### **For Your Team**
- [ ] Production URLs documented
- [ ] Admin credentials stored securely
- [ ] Deployment process documented
- [ ] Environment variables documented
- [ ] Emergency procedures documented

### **For Users**
- [ ] User guide created (optional)
- [ ] FAQ page created (optional)
- [ ] Support contact information available
- [ ] Privacy policy accessible
- [ ] Terms of service accessible

---

## 🎯 **Go Live Checklist**

When ready to accept real orders:

### **Final Preparations**
- [ ] All features tested and working
- [ ] Performance is acceptable
- [ ] Mobile experience tested
- [ ] Payment flow tested end-to-end
- [ ] Email notifications working

### **Switch to Production**
- [ ] Switch Stripe from test to live mode
- [ ] Update Stripe keys in Render environment variables
- [ ] Test payment with real card (small amount)
- [ ] Refund test payment
- [ ] Update any test data in database

### **Marketing & Launch**
- [ ] Create QR code for restaurant
- [ ] Print QR code materials
- [ ] Brief staff on new system
- [ ] Soft launch with limited users
- [ ] Monitor for issues
- [ ] Full launch when stable

---

## 🐛 **Troubleshooting Reference**

If issues arise, check:

1. **Service Logs** in Render dashboard
2. **Browser Console** for frontend errors
3. **Environment Variables** are set correctly
4. **Database Connection** is working
5. **Stripe Keys** are valid
6. **CORS Configuration** allows your frontend
7. **Build Logs** for compilation errors
8. **Network Tab** for API call failures

**Common Issues:**
- Cold starts on free tier (first request slow)
- Missing environment variables
- CORS errors (wrong frontend URL)
- Database connection errors
- Stripe key mismatch
- Email service not configured

---

## 📞 **Support Contacts**

**Render Support:**
- Dashboard: [dashboard.render.com](https://dashboard.render.com)
- Docs: [render.com/docs](https://render.com/docs)
- Community: [community.render.com](https://community.render.com)
- Support: support@render.com

**Stripe Support:**
- Dashboard: [dashboard.stripe.com](https://dashboard.stripe.com)
- Docs: [stripe.com/docs](https://stripe.com/docs)
- Support: [support.stripe.com](https://support.stripe.com)

**Resend Support:**
- Dashboard: [resend.com](https://resend.com)
- Docs: [resend.com/docs](https://resend.com/docs)

---

## 🎉 **Post-Deployment**

After successful deployment:

- [ ] Celebrate! 🎊
- [ ] Share URLs with team
- [ ] Add to portfolio
- [ ] Monitor first few days closely
- [ ] Gather user feedback
- [ ] Plan next features
- [ ] Set up regular backups
- [ ] Schedule maintenance windows

---

## 📈 **Next Steps**

### **Week 1:**
- [ ] Monitor logs daily
- [ ] Test all features regularly
- [ ] Respond to any issues quickly
- [ ] Gather initial user feedback

### **Month 1:**
- [ ] Review analytics
- [ ] Optimize performance
- [ ] Fix reported bugs
- [ ] Plan feature updates

### **Ongoing:**
- [ ] Regular security updates
- [ ] Performance monitoring
- [ ] User feedback implementation
- [ ] Feature development
- [ ] Scale as needed

---

**Deployment Complete! 🚀**

Your TrapHouse Kitchen application is now live and ready to serve customers!
