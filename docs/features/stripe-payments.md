# TrapHouse Kitchen - Stripe Payment Architecture

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CUSTOMER JOURNEY                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │   1. Browse Menu & Add Items  │
                    │      (Cart Management)        │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │   2. Review Cart              │
                    │      • Items + Prices         │
                    │      • Add Optional Tip       │
                    │      • Tax Included           │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │   3. Choose Payment Method    │
                    │   ┌─────────────────────────┐ │
                    │   │ • Credit/Debit Card     │ │
                    │   │ • Apple Pay             │ │
                    │   │ • Cash App Pay          │ │
                    │   │ • Cash on Pickup        │ │
                    │   └─────────────────────────┘ │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │   4. Process Payment          │
                    └───────────────┬───────────────┘
                                    │
                ┌───────────────────┴───────────────────┐
                │                                        │
        ┌───────┴────────┐                    ┌─────────┴────────┐
        │  SUCCESS PATH  │                    │   FAILURE PATH   │
        └───────┬────────┘                    └─────────┬────────┘
                │                                        │
        ┌───────┴────────┐                    ┌─────────┴────────┐
        │ 5a. Confirm    │                    │ 5b. Retry or     │
        │     Order      │                    │     Cancel       │
        │ • Show Receipt │                    │ • Show Error     │
        │ • Prep Time    │                    │ • Offer Retry    │
        │ • Notify Chef  │                    │ • Exit Option    │
        └────────────────┘                    └──────────────────┘
```

---

## 🔄 Payment Flow Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   FRONTEND   │         │   BACKEND    │         │    STRIPE    │
│   (React)    │         │  (Express)   │         │     API      │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       │ 1. Create Order        │                        │
       ├───────────────────────>│                        │
       │                        │                        │
       │                        │ 2. Create PaymentIntent│
       │                        ├───────────────────────>│
       │                        │                        │
       │                        │ 3. Return Client Secret│
       │                        │<───────────────────────┤
       │                        │                        │
       │ 4. Client Secret       │                        │
       │<───────────────────────┤                        │
       │                        │                        │
       │ 5. Confirm Payment     │                        │
       │    (User enters card   │                        │
       │     or uses Apple/     │                        │
       │     Cash App Pay)      │                        │
       ├────────────────────────┼───────────────────────>│
       │                        │                        │
       │                        │                        │
       │                        │   6. Webhook: payment  │
       │                        │      _intent.succeeded │
       │                        │<───────────────────────┤
       │                        │                        │
       │                        │ 7. Update Order Status │
       │                        │    Mark as CONFIRMED   │
       │                        │    Notify Chef         │
       │                        │                        │
       │ 8. Show Success        │                        │
       │    • Receipt           │                        │
       │    • Prep Time         │                        │
       │    • Order Number      │                        │
       │<───────────────────────┤                        │
       │                        │                        │
```

---

## 💳 Payment Methods Architecture

### **1. Credit/Debit Cards** (Stripe Elements)
```
Frontend (Stripe Elements)
    ↓
Card Details → Stripe.js → Tokenization
    ↓
Payment Intent → Backend → Stripe API
    ↓
3D Secure (if required) → Customer Authentication
    ↓
Payment Confirmed → Webhook → Order Confirmed
```

### **2. Apple Pay** (Payment Request API)
```
Frontend (Apple Pay Button)
    ↓
User Authenticates (Face ID/Touch ID)
    ↓
Payment Request → Stripe API
    ↓
Payment Confirmed → Webhook → Order Confirmed
```

### **3. Cash App Pay** (Stripe Integration)
```
Frontend (Cash App Pay Button)
    ↓
Redirect to Cash App → User Approves
    ↓
Return to App → Payment Intent Confirmed
    ↓
Webhook → Order Confirmed
```

### **4. Cash on Pickup**
```
Frontend → Select "Cash on Pickup"
    ↓
Order Created (Status: PENDING_PAYMENT)
    ↓
Chef Receives Order → Prepares Food
    ↓
Customer Pays in Person → Chef Marks as PAID
```

---

## 🗄️ Database Schema

### **Payment Table**
```sql
CREATE TABLE "Payment" (
    "id" TEXT PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT UNIQUE,
    "amount" DECIMAL(10,2) NOT NULL,
    "tipAmount" DECIMAL(10,2) DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT DEFAULT 'usd',
    "status" TEXT NOT NULL, -- pending, processing, succeeded, failed, canceled
    "paymentMethod" TEXT NOT NULL, -- card, apple_pay, cash_app_pay, cash
    "paymentMethodDetails" JSONB,
    "receiptUrl" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE
);

CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX "Payment_stripePaymentIntentId_idx" ON "Payment"("stripePaymentIntentId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
```

### **Transaction Table** (for audit trail)
```sql
CREATE TABLE "Transaction" (
    "id" TEXT PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- charge, refund, partial_refund
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "stripeChargeId" TEXT,
    "stripeRefundId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE
);

CREATE INDEX "Transaction_paymentId_idx" ON "Transaction"("paymentId");
```

### **Updated Order Table**
```sql
ALTER TABLE "Order" ADD COLUMN "paymentStatus" TEXT DEFAULT 'unpaid';
-- Values: unpaid, pending, paid, refunded, partially_refunded

ALTER TABLE "Order" ADD COLUMN "prepTime" INTEGER;
-- Estimated preparation time in minutes
```

---

## 🔐 Security Architecture

### **API Key Management**
```
Environment Variables (.env):
├── STRIPE_PUBLISHABLE_KEY (frontend)
├── STRIPE_SECRET_KEY (backend - NEVER expose to frontend)
├── STRIPE_WEBHOOK_SECRET (webhook signature verification)
└── STRIPE_API_VERSION (optional - defaults to latest)

Backend Validation:
├── Verify webhook signatures
├── Validate payment amounts server-side
├── Check order ownership before payment
└── Prevent duplicate payments
```

### **Webhook Security**
```
1. Stripe sends webhook with signature
2. Backend verifies signature using webhook secret
3. If valid → Process event
4. If invalid → Reject request (403)
5. Return 200 immediately to Stripe
6. Process asynchronously in background
```

---

## 📊 Payment States

### **Order Payment Lifecycle**
```
┌─────────────┐
│   CREATED   │ (Cart → Order created, no payment yet)
└──────┬──────┘
       │
       ├─→ [Cash on Pickup Selected]
       │   └─→ PENDING_PAYMENT → Chef notified → Customer pays in person
       │
       └─→ [Online Payment Selected]
           │
           ├─→ PROCESSING → Payment Intent created
           │       │
           │       ├─→ SUCCEEDED → Order CONFIRMED → Chef notified
           │       │
           │       └─→ FAILED → Show error → Offer retry or cancel
           │
           └─→ CANCELED → Payment abandoned
```

### **Payment Status Flow**
```
pending → processing → succeeded
                    ↓
                  failed → retry → succeeded
                                 ↓
                               canceled
```

---

## 🔔 Chef Notifications

### **Payment Success Flow**
```
Payment Confirmed
    ↓
Backend Webhook Handler
    ↓
┌────────────────────────┐
│ 1. Update Order Status │ → Mark as CONFIRMED
│ 2. Set Payment Status  │ → Mark as PAID
│ 3. Calculate Prep Time │ → Based on order items
│ 4. Create Notification │ → Send to Chef Dashboard
└────────────────────────┘
    ↓
Chef Dashboard Updates (Real-time)
    ├─→ New Order Alert (sound/visual)
    ├─→ Order Details Display
    ├─→ Payment Confirmation Badge
    └─→ Start Preparation Timer
```

---

## 🧪 Testing Architecture

### **Test Card Numbers**
```
Success Cards:
├── 4242 4242 4242 4242 (Visa)
├── 5555 5555 5555 4444 (Mastercard)
├── 3782 822463 10005 (American Express)
└── Any future expiry date, any CVC

Decline Cards:
├── 4000 0000 0000 0002 (Card declined)
├── 4000 0000 0000 9995 (Insufficient funds)
└── 4000 0000 0000 0069 (Expired card)

3D Secure Required:
└── 4000 0025 0000 3155 (Requires authentication)
```

### **Test Mode Features**
```
✅ Full Stripe API functionality
✅ Webhook testing with Stripe CLI
✅ No real money transactions
✅ Apple Pay/Cash App Pay simulation
✅ Payment flow testing
✅ Error handling validation
✅ Refund testing
```

---

## 💰 Tip Calculation

### **Tip Options**
```javascript
// Customer can enter custom tip amount
const calculateTotal = (subtotal, tipAmount) => {
    const tip = tipAmount || 0;
    const total = subtotal + tip;
    
    return {
        subtotal: subtotal,
        tip: tip,
        total: total,
        display: {
            subtotal: `$${subtotal.toFixed(2)}`,
            tip: `$${tip.toFixed(2)}`,
            total: `$${total.toFixed(2)}`
        }
    };
};

// Example suggested tip amounts
const suggestedTips = [
    { label: '$2', amount: 2.00 },
    { label: '$5', amount: 5.00 },
    { label: '$10', amount: 10.00 },
    { label: 'Custom', amount: null }
];
```

---

## 🔄 Refund Architecture

### **Refund Flow**
```
Chef Dashboard
    ↓
Initiate Refund Request
    ↓
Backend validates:
    ├─→ Order exists?
    ├─→ Payment succeeded?
    ├─→ Chef has permission?
    └─→ Not already refunded?
    ↓
Create Stripe Refund
    ↓
Webhook: charge.refunded
    ↓
Update Database:
    ├─→ Payment status → refunded
    ├─→ Order status → cancelled
    └─→ Create Transaction record
    ↓
Notify Customer
```

---

## 📱 Mobile Optimization

### **Apple Pay Integration**
```
Requirements:
├── HTTPS (required for Apple Pay)
├── Valid domain registration
├── Apple Developer Account
└── Proper button styling

Button Placement:
├── Checkout page (primary)
├── Cart page (express checkout)
└── Product detail page (buy now)
```

### **Cash App Pay Integration**
```
Requirements:
├── Stripe account with Cash App enabled
├── US business location
├── USD currency only
└── Customer ID verification

Button Appearance:
├── Black button with Cash App logo
├── "Pay with Cash App" text
└── Prominent placement near other payment options
```

---

## 🚨 Error Handling

### **Payment Failure Scenarios**
```
┌────────────────────────┐
│   Payment Declined     │
├────────────────────────┤
│ • Show friendly error  │
│ • Offer retry button   │
│ • Suggest alternative  │
│   payment method       │
│ • Exit/cancel option   │
└────────────────────────┘

┌────────────────────────┐
│   Network Error        │
├────────────────────────┤
│ • Show loading state   │
│ • Auto-retry (3 times) │
│ • Manual retry button  │
│ • Clear error message  │
└────────────────────────┘

┌────────────────────────┐
│   Validation Error     │
├────────────────────────┤
│ • Highlight invalid    │
│   fields               │
│ • Show inline errors   │
│ • Prevent submission   │
└────────────────────────┘
```

---

## 📈 Analytics & Tracking

### **Payment Metrics to Track**
```
Success Metrics:
├── Successful payments count
├── Total revenue
├── Average order value
├── Average tip amount
└── Payment method distribution

Failure Metrics:
├── Failed payment count
├── Failure reasons
├── Retry success rate
└── Abandonment rate

Performance Metrics:
├── Payment processing time
├── Page load time
├── Time to first interaction
└── Conversion rate
```

---

## 🔧 Configuration

### **Stripe Dashboard Settings**
```
1. Enable Payment Methods:
   ├── Cards (default)
   ├── Apple Pay (enable in settings)
   └── Cash App Pay (enable in settings)

2. Webhook Endpoints:
   ├── URL: https://your-domain.com/api/webhooks/stripe
   ├── Events: payment_intent.succeeded,
   │          payment_intent.payment_failed,
   │          charge.refunded
   └── Secret: whsec_xxx... (auto-generated)

3. Business Settings:
   ├── Business Name: TrapHouse Kitchen
   ├── Location: Alabama, USA
   ├── Currency: USD
   └── Tax handling: Inclusive
```

---

## 📝 Implementation Checklist

### **Backend Tasks**
- [ ] Install Stripe SDK
- [ ] Configure environment variables
- [ ] Create Payment model
- [ ] Create Transaction model
- [ ] Build payment intent endpoint
- [ ] Build webhook handler
- [ ] Add refund functionality
- [ ] Add payment status queries
- [ ] Implement chef notifications

### **Frontend Tasks**
- [ ] Install @stripe/stripe-js
- [ ] Install @stripe/react-stripe-js
- [ ] Create CheckoutPage component
- [ ] Implement Stripe Elements
- [ ] Add Apple Pay button
- [ ] Add Cash App Pay button
- [ ] Add Cash on Pickup option
- [ ] Build tip selection UI
- [ ] Create payment success page
- [ ] Add error handling

### **Testing Tasks**
- [ ] Test card payments
- [ ] Test Apple Pay (requires HTTPS + domain)
- [ ] Test Cash App Pay
- [ ] Test Cash on Pickup flow
- [ ] Test payment failures
- [ ] Test refunds
- [ ] Test webhooks
- [ ] Load testing

---

## 🚀 Production Deployment

### **Pre-Launch Checklist**
```
✅ Switch to Live API keys
✅ Update webhook endpoint to production URL
✅ Configure production webhook secret
✅ Enable HTTPS (required for payments)
✅ Test all payment methods in production
✅ Set up monitoring and alerts
✅ Configure receipt emails
✅ Review Stripe compliance requirements
✅ Test refund flow in production
✅ Document customer support procedures
```

---

## 🎯 Business Configuration

**Business Name:** TrapHouse Kitchen  
**Location:** Alabama, USA  
**Currency:** USD  
**Tax:** Included in menu prices  
**Payment Methods:** Cards, Apple Pay, Cash App Pay, Cash on Pickup  
**Tips:** Custom amount (customer entered)  
**Payment Timing:** At order placement (Pay Now)  
**Test Mode:** ✅ Enabled  

---

## 📞 Support & Resources

- **Stripe Dashboard:** https://dashboard.stripe.com/test/dashboard
- **API Docs:** https://stripe.com/docs/api
- **Webhook Testing:** https://stripe.com/docs/stripe-cli
- **Apple Pay Docs:** https://stripe.com/docs/apple-pay
- **Cash App Pay Docs:** https://stripe.com/docs/cash-app-pay

---

**Architecture Version:** 1.0  
**Last Updated:** 2026-01-12  
**Status:** Implementation Ready ✅
# Stripe Payment Integration - Implementation Complete

## ✅ Code Changes Completed

All code changes have been successfully implemented to enable **automatic payment method detection** through Stripe Payment Element, including Apple Pay, Cash App Pay, Google Pay, and Credit/Debit Cards.

---

## 📋 Changes Summary

### Backend Changes

**File: `backend/src/routes/payment.ts`**

1. **Removed manual payment method selection** - The `paymentMethod` parameter is no longer required
2. **Enabled automatic payment methods** - Payment Intent now includes:
   ```typescript
   payment_method_types: ['card', 'cashapp'],
   automatic_payment_methods: {
     enabled: true,
     allow_redirects: 'always',
   }
   ```
3. **Simplified validation** - Removed `paymentMethod` validation from request body
4. **Updated payment record** - Default to 'CARD' initially; webhook will update with actual method used

**Benefits:**
- Stripe automatically shows all available payment methods
- Apple Pay appears on Safari with configured Wallet
- Cash App Pay appears for eligible users
- Google Pay also becomes available (bonus)
- Future payment methods automatically supported

### Frontend Changes

**File: `frontend/src/pages/CheckoutPage.tsx`**

1. **Removed manual payment method buttons** - No more confusing "select your method" UI
2. **Simplified to two options:**
   - **Pay Now** - Shows Stripe Payment Element with all available methods
   - **Pay with Cash on Pickup** - Separate flow for cash payments
3. **Cleaner UX** - Single unified payment interface
4. **Updated tip handling** - Works seamlessly with new payment flow

**File: `frontend/src/components/PaymentForm.tsx`**

1. **Removed `paymentMethod` prop** - No longer needed
2. **Enhanced Payment Element options:**
   ```typescript
   <PaymentElement
     options={{
       layout: 'tabs',
       wallets: {
         applePay: 'auto',
         googlePay: 'auto',
       },
     }}
   />
   ```
3. **Simplified button text** - Just shows amount: "Pay $XX.XX"

**File: `frontend/public/.well-known/apple-developer-merchantid-domain-association`**

1. **Created directory structure** for Apple Pay domain verification
2. **Placeholder file** with instructions to download from Stripe Dashboard

---

## 🚀 Deployment Steps

### Step 1: Enable Payment Methods in Stripe Dashboard

1. **Go to:** https://dashboard.stripe.com/settings/payment_methods
2. **Enable the following:**
   - ✅ **Cards** (already enabled)
   - ✅ **Cash App Pay** - Click "Turn on" and agree to terms
   - ✅ **Apple Pay** - Click "Turn on" if not already enabled
   - ✅ **Google Pay** (optional) - Will work automatically

### Step 2: Configure Apple Pay Domain Verification

1. **Go to:** https://dashboard.stripe.com/settings/payment_methods/apple_pay
2. **Click:** "Add new domain"
3. **Enter:** `traphousekitchen-web.onrender.com`
4. **Download** the verification file
5. **Replace** the placeholder file at:
   ```
   frontend/public/.well-known/apple-developer-merchantid-domain-association
   ```
6. **Commit and push** to GitHub

### Step 3: Deploy to Render

#### Option A: Git Push (Automatic Deployment)

```bash
cd "/Users/loganware/Documents/Buisness/TrapHouseKitchen v2"

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Integrate automatic payment methods: Apple Pay, Cash App Pay, Google Pay"

# Push to trigger auto-deploy
git push origin main
```

Both `traphousekitchen-api` and `traphousekitchen-web` will automatically redeploy.

#### Option B: Manual Deploy via Render Dashboard

1. **Go to:** https://dashboard.render.com
2. **For backend (`traphousekitchen-api`):**
   - Click service → "Manual Deploy" → "Deploy latest commit"
3. **For frontend (`traphousekitchen-web`):**
   - Click service → "Manual Deploy" → "Deploy latest commit"

### Step 4: Verify Domain Verification

After frontend deploys:

1. **Visit:** https://traphousekitchen-web.onrender.com/.well-known/apple-developer-merchantid-domain-association
2. **Confirm:** File is accessible (should show Apple's verification content)
3. **Return to Stripe Dashboard** → Apple Pay settings
4. **Click:** "Verify" next to your domain
5. **Wait:** For Stripe to confirm verification (usually instant)

### Step 5: Test Payment Methods

#### Test with Stripe Test Mode

**Access the application:**
- Frontend: https://traphousekitchen-web.onrender.com
- Backend: https://traphousekitchen-api.onrender.com

**Test Cards Payment:**
1. Add items to cart (as logged-in customer)
2. Go to checkout
3. Click "Pay Now"
4. You should see the Payment Element with:
   - Card payment tab (default)
   - Link
   - Additional methods based on your location/device
5. Use test card: `4242 4242 4242 4242`
6. Expiration: Any future date
7. CVC: Any 3 digits
8. Complete payment

**Test Apple Pay (Safari Only):**
1. Open checkout on Safari (Mac or iOS)
2. Must have Apple Pay configured in Wallet
3. Click "Pay Now"
4. Look for Apple Pay button in Payment Element
5. Click and authenticate
6. Payment should process successfully

**Test Cash App Pay:**
1. In Stripe test mode, Cash App Pay will show as an option
2. Click the Cash App Pay tab in Payment Element
3. Follow test mode flow
4. **Note:** Real Cash App Pay requires production mode and user with Cash App

**Test Cash on Pickup:**
1. Click "Pay with Cash on Pickup"
2. Confirm order
3. Should redirect to order confirmation
4. Order status: "UNPAID"

---

## 🔍 Expected Behavior After Deployment

### Checkout Flow

1. **User adds items to cart** → Clicks "Checkout"
2. **Order is created** automatically
3. **User sees two main options:**
   - **Pay Now** button (primary)
   - **Pay with Cash on Pickup** button (secondary)
4. **User clicks "Pay Now":**
   - Payment Element loads with all available methods
   - **Tabs shown (based on availability):**
     - **Card** - Always available
     - **Link** - Stripe's 1-click checkout
     - **Apple Pay** - On Safari with Wallet configured
     - **Cash App Pay** - For eligible users
     - **Google Pay** - On Chrome with saved cards
5. **User selects method and completes payment**
6. **Redirects to order confirmation** with prep time

### Payment Element Features

- **Automatic method detection** - Shows only methods user can use
- **Responsive design** - Works on mobile and desktop
- **Secure** - All payment data handled by Stripe
- **PCI compliant** - No sensitive data touches your server
- **Wallet integration** - Fast checkout with saved methods
- **International support** - Works with global cards

---

## 📊 Testing Checklist

### Before Going Live

- [ ] Backend deployed successfully to Render
- [ ] Frontend deployed successfully to Render
- [ ] Apple Pay domain verified in Stripe Dashboard
- [ ] Cash App Pay enabled in Stripe Dashboard
- [ ] Test card payment (4242 4242 4242 4242)
- [ ] Test Apple Pay (on Safari with Wallet)
- [ ] Test Cash on Pickup flow
- [ ] Verify order confirmation email sent
- [ ] Check chef receives order notification
- [ ] Verify order appears in chef dashboard
- [ ] Test on mobile device
- [ ] Test on desktop browser

### Production Checklist

- [ ] Switch to Stripe production keys in Render:
  - `STRIPE_SECRET_KEY` → starts with `sk_live_`
  - `STRIPE_PUBLISHABLE_KEY` → starts with `pk_live_`
  - `VITE_STRIPE_PUBLISHABLE_KEY` → starts with `pk_live_`
- [ ] Re-verify Apple Pay domain for production
- [ ] Enable Cash App Pay for production (requires business verification)
- [ ] Test with real payment (small amount)
- [ ] Verify refund process works
- [ ] Set up webhook monitoring in Stripe Dashboard
- [ ] Enable email notifications (RESEND_API_KEY)

---

## 🎯 What Changed for Users

### Before
- Confusing multi-step process
- Had to select "Card", "Apple Pay", or "Cash App Pay" manually
- Payment form loaded after selection
- Redundant UI elements

### After
- Simple two-option choice: "Pay Now" or "Cash on Pickup"
- All digital payment methods shown automatically in one place
- Faster checkout experience
- Industry-standard payment UX
- More payment options available (Google Pay bonus)

---

## 🔧 Technical Details

### Payment Intent Configuration

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: toStripeAmount(total),
  currency: 'usd',
  payment_method_types: ['card', 'cashapp'],
  automatic_payment_methods: {
    enabled: true,
    allow_redirects: 'always',
  },
  metadata: {
    orderId: order.id,
    userId: order.userId,
    customerName: order.user.name,
    // ... other metadata
  },
  description: `TrapHouse Kitchen Order #${order.id.slice(0, 8)}`,
});
```

**Key Settings:**
- `payment_method_types`: Explicitly enables card and Cash App Pay
- `automatic_payment_methods.enabled`: Allows Stripe to show additional methods
- `allow_redirects: 'always'`: Supports payment methods requiring redirects

### Payment Element Configuration

```typescript
<PaymentElement
  options={{
    layout: 'tabs',
    wallets: {
      applePay: 'auto',
      googlePay: 'auto',
    },
  }}
/>
```

**Key Settings:**
- `layout: 'tabs'`: Shows payment methods as tabs
- `applePay: 'auto'`: Shows Apple Pay when available
- `googlePay: 'auto'`: Shows Google Pay when available

---

## 🆘 Troubleshooting

### Apple Pay Not Showing

**Possible causes:**
1. Not using Safari browser
2. No cards in Apple Wallet
3. Domain not verified in Stripe
4. Verification file not accessible

**Solutions:**
- Test on Safari (Mac or iOS)
- Add a card to Wallet
- Verify domain in Stripe Dashboard
- Check: https://traphousekitchen-web.onrender.com/.well-known/apple-developer-merchantid-domain-association

### Cash App Pay Not Showing

**Possible causes:**
1. Not enabled in Stripe Dashboard
2. User not eligible (location, etc.)
3. Test mode limitations

**Solutions:**
- Enable in Stripe settings
- Test in production mode
- Verify US-based account

### Payment Element Not Loading

**Possible causes:**
1. Invalid Stripe publishable key
2. Network issues
3. CORS errors

**Solutions:**
- Check `VITE_STRIPE_PUBLISHABLE_KEY` in Render
- Check browser console for errors
- Verify API endpoint accessible

### Checkout Failed Error

**Possible causes:**
1. Backend not receiving request
2. Database connection issue
3. Stripe API error

**Solutions:**
- Check Render backend logs
- Verify database connection
- Check Stripe Dashboard for errors

---

## 📚 Resources

### Stripe Documentation
- Payment Element: https://stripe.com/docs/payments/payment-element
- Apple Pay: https://stripe.com/docs/apple-pay
- Cash App Pay: https://stripe.com/docs/payments/cash-app-pay
- Testing: https://stripe.com/docs/testing

### Render Documentation
- Deploying: https://render.com/docs/deploys
- Environment Variables: https://render.com/docs/configure-environment-variables
- Static Site Routing: https://render.com/docs/deploy-create-react-app

### Project Links
- Frontend: https://traphousekitchen-web.onrender.com
- Backend: https://traphousekitchen-api.onrender.com/health
- Stripe Dashboard: https://dashboard.stripe.com
- Render Dashboard: https://dashboard.render.com

---

## ✅ Implementation Status

| Task | Status | Details |
|------|--------|---------|
| Backend payment method types update | ✅ Complete | `backend/src/routes/payment.ts` |
| Frontend checkout UI simplification | ✅ Complete | `frontend/src/pages/CheckoutPage.tsx` |
| Payment form component update | ✅ Complete | `frontend/src/components/PaymentForm.tsx` |
| Domain verification file created | ✅ Complete | `frontend/public/.well-known/` |
| Stripe Dashboard configuration | ⏳ Pending | User action required |
| Domain verification completion | ⏳ Pending | After Stripe config |
| Deployment to Render | ⏳ Ready | Awaiting git push |
| Production testing | ⏳ Pending | After deployment |

---

## 🚀 Ready to Deploy!

All code changes are complete and ready for deployment. Follow the steps above to:

1. Enable payment methods in Stripe Dashboard
2. Complete Apple Pay domain verification
3. Deploy to Render
4. Test all payment methods
5. Switch to production mode

Your customers will now enjoy a seamless, modern checkout experience with multiple payment options!
