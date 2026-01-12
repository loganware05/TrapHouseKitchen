# ✅ Checkout Fixes & Testing Guide

**Date:** January 12, 2026  
**Status:** Fixes Applied - Ready for Testing

---

## 🔧 **What Was Fixed**

### 1. ✅ Cart Hidden for Chefs
**Issue:** Chefs could see the cart icon even though they don't need to order  
**Fix:** Updated `Layout.tsx` to only show cart for logged-in CUSTOMER role users

```typescript
{/* Only show cart for logged-in customers (not chefs/admins) */}
{!isChefRoute && user && user.role === 'CUSTOMER' && (
  <Link to="/cart" className="relative p-2 text-gray-600 hover:text-primary-600">
    <ShoppingCart className="h-6 w-6" />
    ...
  </Link>
)}
```

### 2. ✅ Cart Hidden for Non-Logged-In Users
**Issue:** Anonymous users could see cart (but cart items wouldn't persist)  
**Fix:** Cart now only visible when user is logged in as a CUSTOMER

### 3. ✅ Cart and Checkout Routes Protected
**Issue:** Anyone could access `/cart` and `/checkout` URLs  
**Fix:** Added `customerOnly` protection to routes in `App.tsx`

```typescript
<Route
  path="cart"
  element={
    <ProtectedRoute customerOnly>
      <CartPage />
    </ProtectedRoute>
  }
/>
<Route
  path="checkout"
  element={
    <ProtectedRoute customerOnly>
      <CheckoutPage />
    </ProtectedRoute>
  }
/>
```

**Behavior:**
- **Not logged in:** Redirect to `/login`
- **Logged in as CHEF:** Redirect to `/chef`
- **Logged in as CUSTOMER:** Allow access ✅

---

## 🐛 **Checkout Failure - Likely Causes & Solutions**

### **Cause 1: No Dishes in Database**
**Problem:** Can't add items to cart if there are no dishes  
**Solution:** Chef needs to add dishes first

**Steps to Fix:**
1. Login as chef: [http://localhost:5173/chef/login](http://localhost:5173/chef/login)
   ```
   Email: chef@traphouse.com
   Password: chef123
   ```

2. Go to Menu Management: [http://localhost:5173/chef/menu](http://localhost:5173/chef/menu)

3. Click "Add New Dish" and fill in:
   ```
   Name: Test Burger
   Description: Delicious test burger
   Price: 12.99
   Category: Main Courses
   Status: Available
   ```

4. Click "Create Dish"

5. Repeat for a few more dishes

---

### **Cause 2: Payment Method Not Initialized**
**Problem:** User clicks "Checkout" but payment method not selected yet  
**Solution:** Ensure user selects a payment method first

**How the Checkout Flow Works:**
1. User adds items to cart
2. User goes to `/checkout`
3. System creates an order in "PENDING" status
4. **User MUST select a payment method:**
   - Credit/Debit Card
   - Apple Pay
   - Cash App Pay
   - Cash on Pickup
5. When payment method is selected:
   - For **cash**: Order is confirmed immediately (pay on pickup)
   - For **card/apple_pay/cash_app_pay**: Payment intent is created with Stripe
6. User enters payment details (if not cash)
7. User clicks "Pay $XX.XX"
8. Payment is processed
9. Order is confirmed

---

### **Cause 3: Missing Client Secret**
**Problem:** Stripe Elements doesn't render  
**Root Cause:** Payment intent not created or failed

**Check in Browser DevTools:**
```javascript
// Open Console (F12 → Console)
// Check for errors like:
- "Failed to initialize payment"
- "Error creating payment intent"
- Network error to /api/payment/create-payment-intent
```

**Debug Steps:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Filter by "XHR"
4. Try checking out
5. Look for `/api/payment/create-payment-intent` request
6. Click it and check:
   - **Status**: Should be `200 OK`
   - **Response**: Should have `clientSecret`

**If Request Fails:**
- Check **Console** for JavaScript errors
- Check **Response** tab for error message
- Common issues:
  - Order not found
  - User not authenticated
  - Stripe keys not configured

---

### **Cause 4: Stripe Test Mode Issues**
**Problem:** Stripe configuration invalid  
**Check:**

```bash
# Test Stripe config endpoint
curl http://localhost:3001/api/payment/config | jq .
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "publishableKey": "pk_test_...",
    "currency": "usd",
    "businessName": "TrapHouse Kitchen",
    "country": "US"
  }
}
```

**If publishableKey is null:**
- Backend `.env` missing `STRIPE_PUBLISHABLE_KEY`
- Restart backend after adding it

---

## 🧪 **Complete Testing Guide**

### **Step 1: Add Test Dishes (Chef)**

1. **Login as Chef:**
   - URL: [http://localhost:5173/chef/login](http://localhost:5173/chef/login)
   - Email: `chef@traphouse.com`
   - Password: `chef123`

2. **Go to Menu Management:**
   - URL: [http://localhost:5173/chef/menu](http://localhost:5173/chef/menu)

3. **Add 3-5 Dishes:**
   Example dishes:
   ```
   Dish 1:
   - Name: Classic Burger
   - Price: 12.99
   - Category: Main Courses
   - Description: Juicy beef burger with lettuce, tomato, onion
   
   Dish 2:
   - Name: Caesar Salad
   - Price: 8.99
   - Category: Appetizers
   - Description: Crisp romaine, parmesan, croutons, caesar dressing
   
   Dish 3:
   - Name: Chocolate Cake
   - Price: 6.99
   - Category: Desserts
   - Description: Rich chocolate cake with chocolate ganache
   ```

4. **Verify Dishes Appear:**
   - Go to customer menu: [http://localhost:5173/menu](http://localhost:5173/menu)
   - Should see all dishes listed

---

### **Step 2: Test Customer Checkout Flow**

1. **Logout (if logged in as chef)**

2. **Register New Customer:**
   - URL: [http://localhost:5173/register](http://localhost:5173/register)
   ```
   Name: Test Customer
   Email: customer@test.com
   Password: password123
   ```

3. **Browse Menu:**
   - URL: [http://localhost:5173/menu](http://localhost:5173/menu)

4. **Add Items to Cart:**
   - Click on a dish
   - Click "Add to Cart" button
   - Repeat for 2-3 dishes

5. **View Cart:**
   - Click cart icon in header (should show item count)
   - URL: [http://localhost:5173/cart](http://localhost:5173/cart)
   - Verify all items are listed
   - Verify total price is correct

6. **Proceed to Checkout:**
   - Click "Proceed to Checkout" button
   - Should redirect to: [http://localhost:5173/checkout](http://localhost:5173/checkout)

7. **Add Tip (Optional):**
   - Click preset tip ($2, $5, $10)
   - OR enter custom tip amount
   - Verify total updates

8. **Select Payment Method:**
   
   **Option A: Cash on Pickup**
   - Click "Cash on Pickup" button
   - Order should confirm immediately
   - Should show "Order confirmed! Pay when you pick up."
   - Should redirect to orders page
   
   **Option B: Credit Card (Test Mode)**
   - Click "Credit or Debit Card" button
   - Wait for payment form to load
   - **Enter test card details:**
     ```
     Card Number: 4242 4242 4242 4242
     Expiry: 12/28
     CVC: 123
     ZIP: 12345
     ```
   - Click "Pay $XX.XX" button
   - Should see "Payment successful!"
   - Should redirect to orders page

---

### **Step 3: Verify Order (Customer)**

1. **Check Orders Page:**
   - URL: [http://localhost:5173/orders](http://localhost:5173/orders)
   - Should see the order you just placed
   - Status: "PENDING"
   - Payment Status: "PAID" (for card) or "UNPAID" (for cash)

---

### **Step 4: Manage Order (Chef)**

1. **Login as Chef:**
   - URL: [http://localhost:5173/chef/login](http://localhost:5173/chef/login)

2. **View Orders:**
   - URL: [http://localhost:5173/chef/orders](http://localhost:5173/chef/orders)
   - Should see the customer's order
   - Can update status: Preparing → Ready → Completed

---

## 🔍 **Troubleshooting Checkout Failures**

### **Error: "Checkout failed"**

**Check Browser Console (F12):**

1. **Error: "Your cart is empty"**
   - **Cause:** No items in cart
   - **Fix:** Add items to cart first

2. **Error: "Please log in to checkout"**
   - **Cause:** Not logged in
   - **Fix:** Login or register

3. **Error: "Failed to create order"**
   - **Cause:** Backend error
   - **Check:** Browser DevTools → Network tab → `/orders` request
   - **Common issues:**
     - Dish no longer available
     - Price mismatch
     - Database connection issue

4. **Error: "Failed to initialize payment"**
   - **Cause:** Payment intent creation failed
   - **Check:** Browser DevTools → Network tab → `/payment/create-payment-intent` request
   - **Common issues:**
     - Order ID not found
     - Stripe keys missing
     - Network timeout

5. **Error: "Payment failed" or "Card declined"**
   - **Cause:** Stripe payment processing error
   - **Fix:** 
     - Use correct test card: `4242 4242 4242 4242`
     - Check Stripe Dashboard for error details
     - Try "Cash on Pickup" as alternative

---

## 📊 **Expected Behavior Summary**

### **For Chefs:**
- ❌ Cannot see cart icon
- ❌ Cannot access `/cart` (redirects to `/chef`)
- ❌ Cannot access `/checkout` (redirects to `/chef`)
- ✅ Can view orders from customers
- ✅ Can manage menu items

### **For Customers:**
- ✅ Can see cart icon (when logged in)
- ✅ Can add items to cart
- ✅ Can view cart at `/cart`
- ✅ Can checkout at `/checkout`
- ✅ Can place orders with various payment methods

### **For Anonymous Users:**
- ❌ Cannot see cart icon
- ❌ Cannot access `/cart` (redirects to `/login`)
- ❌ Cannot access `/checkout` (redirects to `/login`)
- ✅ Can browse menu
- ✅ Can view dish details

---

## 💡 **Common Test Mistakes**

1. **❌ Trying to checkout without dishes in database**
   - ✅ Add dishes as chef first

2. **❌ Not selecting a payment method before paying**
   - ✅ Click a payment method button first

3. **❌ Using real card numbers in test mode**
   - ✅ Use test card: `4242 4242 4242 4242`

4. **❌ Expecting instant payment form**
   - ✅ Form loads after selecting payment method (not cash)

5. **❌ Testing as chef**
   - ✅ Login as customer to test checkout

---

## 🎯 **Quick Validation Checklist**

Before reporting checkout failure, verify:

- [ ] Database has dishes (check `/menu`)
- [ ] Logged in as **customer** (not chef)
- [ ] Items in cart (check cart icon badge)
- [ ] Selected a payment method on checkout page
- [ ] Payment form loaded (for non-cash methods)
- [ ] Used correct test card: `4242 4242 4242 4242`
- [ ] No errors in browser console (F12)
- [ ] Backend is running (check `/health`)
- [ ] Stripe keys configured (check `/api/payment/config`)

---

## 🚀 **Testing NOW**

Servers are running and fixes are applied:

**Backend:** http://localhost:3001 ✅  
**Frontend:** http://localhost:5173 ✅  

**Start Testing:**
1. Chef Login: [http://localhost:5173/chef/login](http://localhost:5173/chef/login)
2. Add dishes first
3. Logout
4. Customer Register: [http://localhost:5173/register](http://localhost:5173/register)
5. Add items to cart
6. Checkout!

---

**All fixes have been applied and servers are running. Follow the testing guide above to verify the checkout flow!**
