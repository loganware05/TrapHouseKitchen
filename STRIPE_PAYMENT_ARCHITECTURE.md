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
