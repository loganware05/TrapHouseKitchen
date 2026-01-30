# 🚀 TrapHouse Kitchen - Go Live Action Plan

## ⚠️ IMPORTANT: This Requires YOUR Action

Your application is **already production-ready**! No code changes are needed. You just need to complete business verification in Stripe and switch API keys.

**All steps below must be done by YOU** in the Stripe Dashboard and Render Dashboard.

---

## 📋 Quick Checklist (Complete in Order)

### Phase 1: Stripe Business Verification (30 minutes)
- [ ] 1.1 Log into Stripe Dashboard
- [ ] 1.2 Complete business information
- [ ] 1.3 Add personal information (owner)
- [ ] 1.4 Add bank account for payouts
- [ ] 1.5 Submit for verification
- [ ] 1.6 Wait for approval (instant to 2 days)

### Phase 2: Get Live API Keys (5 minutes)
- [ ] 2.1 Switch Stripe to "Live" mode
- [ ] 2.2 Copy Live Publishable Key (pk_live_...)
- [ ] 2.3 Copy Live Secret Key (sk_live_...)
- [ ] 2.4 Save keys securely

### Phase 3: Update Render Environment Variables (10 minutes)
- [ ] 3.1 Update backend STRIPE_SECRET_KEY
- [ ] 3.2 Update backend STRIPE_PUBLISHABLE_KEY
- [ ] 3.3 Update frontend VITE_STRIPE_PUBLISHABLE_KEY
- [ ] 3.4 Wait for auto-redeploy

### Phase 4: Enable Payment Methods (15 minutes)
- [ ] 4.1 Enable Cards (Live mode)
- [ ] 4.2 Enable Cash App Pay (Live mode)
- [ ] 4.3 Enable Apple Pay (Live mode)
- [ ] 4.4 Verify Apple Pay domain
- [ ] 4.5 Download & replace verification file
- [ ] 4.6 Commit and push to GitHub

### Phase 5: Configure Webhooks (10 minutes)
- [ ] 5.1 Add webhook endpoint in Live mode
- [ ] 5.2 Select events to listen to
- [ ] 5.3 Copy webhook signing secret
- [ ] 5.4 Add STRIPE_WEBHOOK_SECRET to Render

### Phase 6: Test & Verify (20 minutes)
- [ ] 6.1 Make real test order
- [ ] 6.2 Verify payment in Stripe Dashboard
- [ ] 6.3 Verify order in app
- [ ] 6.4 Check email notifications
- [ ] 6.5 Test refund (optional)

**Total Time: ~90 minutes + waiting for Stripe approval**

---

## 🔐 PHASE 1: Complete Stripe Business Verification

### Step 1: Log into Stripe Dashboard
1. Go to: https://dashboard.stripe.com
2. Ensure you're logged in with your business account

### Step 2: Navigate to Business Settings
1. Click **Settings** (gear icon, bottom left)
2. Click **Business settings** (or go to: https://dashboard.stripe.com/settings/public)

### Step 3: Complete Public Business Information
Fill out these fields:
- **Business name:** `TrapHouse Kitchen`
- **Support email:** Your customer support email
- **Support phone:** Your phone number
- **Business website:** `https://traphousekitchen-web.onrender.com`

### Step 4: Complete Company Details
Fill out these fields:
- **Legal business name:** (Your registered business name)
- **Business address:** (Your official business address)
- **Tax ID:** (Your EIN or SSN if sole proprietor)
- **Business type:** (LLC, Corporation, Sole Proprietor, etc.)
- **Industry:** Food & Beverage → Restaurant

### Step 5: Complete Representative Details
Fill out your personal information as business owner:
- **Full legal name:** (Your name)
- **Date of birth:** (Your DOB)
- **Last 4 of SSN:** (Your SSN last 4 digits)
- **Home address:** (Your residential address)
- **Phone number:** (Your phone)

### Step 6: Add Banking Information
1. Click **Payouts** or **Banking** section
2. Click **Add bank account**
3. Enter:
   - **Routing number:** (Your bank's routing number)
   - **Account number:** (Your account number)
   - **Account type:** Checking or Savings
4. Verify with micro-deposits (Stripe will deposit 2 small amounts)

### Step 7: Submit for Review
1. Review all information
2. Click **Submit** or **Activate payments**
3. Wait for approval email (usually instant, max 2 business days)

**✅ You'll receive an email when approved!**

---

## 🔑 PHASE 2: Get Live API Keys

### Step 1: Switch to Live Mode
1. In Stripe Dashboard, look at top-right corner
2. Toggle from **"Test mode"** to **"Live mode"**
3. Dashboard should now show "Viewing live data"

### Step 2: Navigate to API Keys
1. Click **Developers** (top right)
2. Click **API keys**
3. Or go to: https://dashboard.stripe.com/apikeys

### Step 3: Copy Your Live Keys

**Publishable Key:**
```
pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
- Already visible, just copy it
- Save this - you'll need it for Render

**Secret Key:**
```
sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
- Click **"Reveal live key token"**
- Copy the entire key
- **IMPORTANT:** This is shown only once! Save it securely.

**⚠️ Security Note:**
- Never share these keys
- Never commit them to Git
- Only add them to Render environment variables

---

## ⚙️ PHASE 3: Update Render Environment Variables

### Step 1: Update Backend Service

1. **Go to Render Dashboard:**
   - URL: https://dashboard.render.com

2. **Select Backend Service:**
   - Click on `traphousekitchen-api`

3. **Go to Environment Tab:**
   - Click **Environment** in left sidebar

4. **Update Variables:**
   
   Find `STRIPE_SECRET_KEY`:
   - Click **Edit**
   - Replace with your **Live Secret Key** (starts with `sk_live_`)
   - Click **Save**
   
   Find `STRIPE_PUBLISHABLE_KEY`:
   - Click **Edit**
   - Replace with your **Live Publishable Key** (starts with `pk_live_`)
   - Click **Save**

5. **Save Changes:**
   - Click **Save Changes** button at bottom
   - Service will automatically redeploy
   - Wait ~3-5 minutes for deployment to complete

### Step 2: Update Frontend Service

1. **Select Frontend Service:**
   - Go back to Render Dashboard
   - Click on `traphousekitchen-web`

2. **Go to Environment Tab:**
   - Click **Environment** in left sidebar

3. **Update Variable:**
   
   Find `VITE_STRIPE_PUBLISHABLE_KEY`:
   - Click **Edit**
   - Replace with your **Live Publishable Key** (starts with `pk_live_`)
   - Click **Save**

4. **Save Changes:**
   - Click **Save Changes** button at bottom
   - Service will automatically redeploy
   - Wait ~3-5 minutes for deployment to complete

**✅ Your app is now using live Stripe keys!**

---

## 💳 PHASE 4: Enable Payment Methods for Production

### Step 1: Ensure Live Mode is Active
1. In Stripe Dashboard, verify toggle shows **"Live"** (top right)
2. All settings below must be in Live mode

### Step 2: Navigate to Payment Methods
1. Go to **Settings** → **Payment methods**
2. Or visit: https://dashboard.stripe.com/settings/payment_methods
3. Confirm you're in **Live mode**

### Step 3: Enable Payment Methods

**Cards:**
- Should already be enabled
- If not, click **Turn on**

**Cash App Pay:**
- Find "Cash App Pay" in the list
- Click **Turn on**
- Read and agree to terms
- Click **Enable**

**Apple Pay:**
- Find "Apple Pay" in the list
- Click **Turn on** (if not already enabled)
- Proceed to domain verification below

**Google Pay:**
- Usually enabled automatically
- No action needed

### Step 4: Verify Apple Pay Domain (Important!)

1. **In Live Mode, go to Apple Pay settings:**
   - URL: https://dashboard.stripe.com/settings/payment_methods/apple_pay
   - Ensure **"Live"** mode selected

2. **Add Your Domain:**
   - Click **"Add new domain"**
   - Enter: `traphousekitchen-web.onrender.com`
   - Click **Add domain**

3. **Download Verification File:**
   - Click **"Download"** next to your domain
   - Save the file (it's named `apple-developer-merchantid-domain-association`)

4. **Replace Verification File in Your Project:**
   ```bash
   cd "/Users/loganware/Documents/Buisness/TrapHouseKitchen v2"
   
   # Replace the placeholder with downloaded file
   cp ~/Downloads/apple-developer-merchantid-domain-association \
     frontend/public/.well-known/apple-developer-merchantid-domain-association
   ```

5. **Commit and Deploy:**
   ```bash
   git add frontend/public/.well-known/apple-developer-merchantid-domain-association
   git commit -m "chore: update Apple Pay verification file for production"
   git push origin main
   ```

6. **Wait for Render to Deploy:**
   - Frontend will auto-deploy (~3-5 minutes)

7. **Verify in Stripe:**
   - Go back to Apple Pay settings
   - Find `traphousekitchen-web.onrender.com`
   - Click **"Verify"**
   - Should show ✅ **"Verified"**

**✅ Apple Pay is now enabled for production!**

---

## 🔔 PHASE 5: Configure Production Webhooks

Webhooks notify your app about payment events in real-time.

### Step 1: Navigate to Webhooks
1. In Stripe Dashboard (**Live mode**)
2. Go to **Developers** → **Webhooks**
3. Or visit: https://dashboard.stripe.com/webhooks

### Step 2: Add Webhook Endpoint
1. Click **"Add endpoint"** button
2. Enter endpoint details:

   **Endpoint URL:**
   ```
   https://traphousekitchen-api.onrender.com/api/webhooks/stripe
   ```

   **Description:**
   ```
   TrapHouse Kitchen Payment Events
   ```

3. Click **"Select events"**

### Step 3: Select Events to Listen To
Select these events:
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `charge.refunded`
- ✅ `checkout.session.completed`

Click **"Add events"**

### Step 4: Create Endpoint
- Click **"Add endpoint"**
- Endpoint is now created

### Step 5: Get Signing Secret
1. Click on your newly created endpoint
2. In the **"Signing secret"** section, click **"Reveal"**
3. Copy the secret (starts with `whsec_`)

   Example:
   ```
   whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Step 6: Add Signing Secret to Render

1. **Go to Render Dashboard:**
   - URL: https://dashboard.render.com

2. **Select Backend Service:**
   - Click on `traphousekitchen-api`

3. **Go to Environment Tab:**
   - Click **Environment**

4. **Add New Variable:**
   - Click **"Add Environment Variable"**
   - **Key:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** `whsec_xxxxxxxxxxxxx` (paste your signing secret)
   - Click **Save**

5. **Save Changes:**
   - Click **"Save Changes"**
   - Backend will redeploy

**✅ Webhooks are now configured for production!**

---

## 🧪 PHASE 6: Test with Real Payment

**⚠️ IMPORTANT:** You will be charged real money for this test!

### Step 1: Visit Your Live Site
1. Open browser
2. Go to: https://traphousekitchen-web.onrender.com
3. Clear cache if needed (Cmd+Shift+R on Mac)

### Step 2: Create Customer Account
1. Click **Register** or **Login**
2. Create a new account or log in
3. Complete registration

### Step 3: Add Item to Cart
1. Browse menu
2. Find a **cheap item** (lowest price available)
3. Click **Add to Cart**
4. Go to **Cart**

### Step 4: Proceed to Checkout
1. Click **Checkout**
2. Optionally add a small tip ($1-2)
3. Click **"Pay Now"**

### Step 5: Complete Payment
1. **Payment Element** should load
2. Select payment method (use your real card)
3. Enter **your real credit card** details:
   - Card number
   - Expiration date
   - CVC
   - ZIP code
4. Click **"Pay $X.XX"**

### Step 6: Verify Success
1. Should redirect to **Order Confirmation** page
2. Should show:
   - ✅ Order ID
   - ✅ Total amount charged
   - ✅ Estimated prep time
   - ✅ Order details

### Step 7: Check Stripe Dashboard
1. Go to: https://dashboard.stripe.com/payments (**Live mode**)
2. You should see your payment
3. Status should be **"Succeeded"**
4. Amount should match your order

### Step 8: Check Your App
1. **As Customer:**
   - Go to **Orders** page
   - Should see your new order
   - Status should be "PENDING" or "PREPARING"

2. **As Chef:**
   - Log out
   - Go to: https://traphousekitchen-web.onrender.com/chef/login
   - Login with chef credentials
   - Check **Chef Dashboard**
   - Your test order should appear

### Step 9: Check Email Notifications
1. Check your email (customer email)
2. Should receive **Order Confirmation** email
3. Check chef email
4. Should receive **New Order** notification

### Step 10: Test Refund (Optional)
1. In Stripe Dashboard, click on your test payment
2. Click **"Refund payment"**
3. Enter refund amount (full or partial)
4. Click **"Refund"**
5. Money will return to your card in 2-5 business days

**✅ If all steps work, you're LIVE!**

---

## ✅ Final Verification Checklist

### Stripe Dashboard (Live Mode)
- [ ] Business verification: **Approved**
- [ ] Bank account: **Added and verified**
- [ ] API keys: **Live keys active**
- [ ] Payment methods: **Enabled (Cards, Cash App, Apple Pay)**
- [ ] Apple Pay domain: **Verified**
- [ ] Webhooks: **Configured with signing secret**

### Render (Production)
- [ ] Backend STRIPE_SECRET_KEY: **Live key (sk_live_)**
- [ ] Backend STRIPE_PUBLISHABLE_KEY: **Live key (pk_live_)**
- [ ] Frontend VITE_STRIPE_PUBLISHABLE_KEY: **Live key (pk_live_)**
- [ ] Backend STRIPE_WEBHOOK_SECRET: **Added (whsec_)**
- [ ] Both services: **Deployed successfully**

### Application Testing
- [ ] Site loads: **✓**
- [ ] Customer can register: **✓**
- [ ] Can add items to cart: **✓**
- [ ] Checkout works: **✓**
- [ ] Payment completes: **✓**
- [ ] Order appears in app: **✓**
- [ ] Chef receives notification: **✓**
- [ ] Customer receives confirmation: **✓**
- [ ] No console errors: **✓**

---

## 💰 What Happens Next

### Automatic Processes
- **Payments:** Customers pay instantly with real cards
- **Webhooks:** Your app receives real-time payment updates
- **Payouts:** Stripe deposits money to your bank (2-day default)
- **Fees:** Stripe takes 2.9% + $0.30 per transaction
- **Email:** Customers and chefs receive real notifications

### Your Responsibilities
- **Monitor orders:** Check chef dashboard regularly
- **Fulfill orders:** Prepare food and notify customers
- **Handle disputes:** Respond to any chargebacks
- **Customer support:** Help customers with issues
- **Monitor Stripe Dashboard:** Check for unusual activity

---

## 🆘 Troubleshooting

### "Account not activated" error
**Problem:** Stripe verification incomplete
**Solution:** Go to Stripe Dashboard → Complete all business info sections

### Payments failing in production
**Problem:** Still using test keys
**Solution:** Verify Render has `sk_live_` keys, not `sk_test_`

### Apple Pay not showing
**Problem:** Domain not verified for Live mode
**Solution:** Re-verify domain in Live mode with production verification file

### Webhook events not received
**Problem:** Webhook not configured for Live mode
**Solution:** Add webhook endpoint in Live mode with correct URL

### Order not appearing in app
**Problem:** Webhook signing secret missing or incorrect
**Solution:** Add STRIPE_WEBHOOK_SECRET to Render backend

---

## 📞 Support Resources

### Stripe Support
- Help Center: https://support.stripe.com
- Live Chat: Available in Stripe Dashboard
- Phone: 1-888-926-2289 (US)
- Email: support@stripe.com

### Render Support
- Documentation: https://render.com/docs
- Community: https://community.render.com
- Support: support@render.com

### Your Application
- Frontend: https://traphousekitchen-web.onrender.com
- Backend Health: https://traphousekitchen-api.onrender.com/health
- Stripe Dashboard: https://dashboard.stripe.com
- Render Dashboard: https://dashboard.render.com

---

## 🎉 Congratulations!

Once you complete all steps above, **TrapHouse Kitchen is LIVE** and ready to accept real payments from real customers!

### What You Accomplished
✅ Verified your business with Stripe
✅ Switched to production mode
✅ Enabled multiple payment methods
✅ Configured webhooks for real-time updates
✅ Tested end-to-end with real payment
✅ Ready to serve customers!

### Next Steps
1. **Market your business:** Share your website URL
2. **Monitor orders:** Check chef dashboard daily
3. **Provide excellent service:** Build your reputation
4. **Grow:** Add more menu items as needed

**Your food delivery platform is now LIVE!** 🚀

---

**Estimated Total Time:** 90 minutes + Stripe approval wait (0-48 hours)

**Need Help?** Refer to the comprehensive guide: `STRIPE_PAYMENT_INTEGRATION_COMPLETE.md`
