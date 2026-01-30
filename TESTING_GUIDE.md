# TrapHouse Kitchen v2 - Comprehensive Testing Guide

## 🔧 Critical Fix Applied

**CORS Issue Fixed**: Updated backend to allow multiple localhost ports (5173, 5174, 3000) in development mode. This was preventing login functionality.

---

## 📋 Pre-Testing Setup

### 1. Start Backend Server
```bash
cd "/Users/loganware/Documents/Buisness/TrapHouseKitchen v2/backend"
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 3001
📱 Environment: development
```

### 2. Start Frontend Server
```bash
cd "/Users/loganware/Documents/Buisness/TrapHouseKitchen v2/frontend"
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/ (or 5174)
```

### 3. Verify Database Migration
Ensure the reviews and coupons migration was applied:
```bash
cd "/Users/loganware/Documents/Buisness/TrapHouseKitchen v2/backend"
npx prisma studio
```
Check that `Review` and `Coupon` tables exist.

---

## 🧪 Feature Testing Checklist

## 1. Landing Page & Navigation ✅

### Test: Menu is Now the Landing Page
- [ ] Open the app in browser
- [ ] Verify that the **Menu page** loads by default (not a home page)
- [ ] Confirm dishes are displayed
- [ ] Check that categories are visible

### Test: Navigation Updates
**For Logged-Out Users:**
- [ ] Verify "Reviews" tab is visible in navigation
- [ ] Verify "Requests" tab is **NOT** visible
- [ ] Verify "Login" button in top-right header

**For Logged-In Customers:**
- [ ] Menu tab exists
- [ ] Reviews tab exists  
- [ ] Requests tab exists (after login)
- [ ] Orders tab exists

**For Chef/Admin:**
- [ ] Dashboard tab
- [ ] Menu tab
- [ ] Orders tab
- [ ] Reviews tab (NEW)
- [ ] Ingredients tab

---

## 2. Authentication System 🔐

### Test: Customer Registration
1. [ ] Click "Login" button in header
2. [ ] Click "create a new account" link
3. [ ] Fill out registration form:
   - Name: `Test Customer`
   - Email: `customer@test.com`
   - Password: `password123`
   - Confirm Password: `password123`
4. [ ] Click "Create account"
5. [ ] Verify success toast appears
6. [ ] Verify redirect to Menu page
7. [ ] Verify user name appears in top-right header
8. [ ] Verify cart icon is visible

### Test: Customer Login
1. [ ] Logout (click logout icon)
2. [ ] Click "Login" button
3. [ ] Enter credentials:
   - Email: `customer@test.com`
   - Password: `password123`
4. [ ] Click "Sign in"
5. [ ] Verify successful login
6. [ ] Verify redirect to Menu page

### Test: Guest Login
1. [ ] Logout
2. [ ] Click "Login" button
3. [ ] Click "Continue as guest instead"
4. [ ] Enter name: `Guest User`
5. [ ] Click "Continue"
6. [ ] Verify guest login success
7. [ ] Note: Guests can order but may have limited review features

### Test: Chef Login
1. [ ] Navigate to `/chef/login`
2. [ ] Enter chef credentials (create a chef user if needed via database)
3. [ ] Verify redirect to Chef Dashboard
4. [ ] Verify chef navigation items appear

---

## 3. Review System 🌟

### Test: Public Reviews (Logged-Out)
1. [ ] Logout from the app
2. [ ] Click "Reviews" tab
3. [ ] Verify you can **view approved reviews**
4. [ ] Verify you **cannot** write a review (button hidden or prompts login)
5. [ ] Check that review displays show:
   - Star rating (1-5)
   - Comment text
   - Dish names
   - Reviewer name
   - Date posted

### Test: Writing a Review (Customer)
**Prerequisites:** Must have a completed order within last 30 days

1. [ ] Login as customer
2. [ ] Click "Reviews" tab
3. [ ] Click "Write a Review" button
4. [ ] Select an eligible order from dropdown
5. [ ] Select star rating (1-5)
6. [ ] Enter comment: `Great food! Really enjoyed the flavors.`
7. [ ] Click "Submit Review"
8. [ ] Verify success message appears
9. [ ] Verify redirect to "My Reviews" page
10. [ ] Verify review shows "Pending Approval" status

### Test: My Reviews Page (Customer)
1. [ ] Navigate to "Reviews" → "My Reviews"
2. [ ] Verify your submitted review appears
3. [ ] Check review status: "Pending Approval"
4. [ ] Verify **no coupon code** shown yet (pending approval)
5. [ ] Test Edit button (if implemented)
6. [ ] Test Delete button

### Test: Chef Review Approval
1. [ ] Login as Chef/Admin
2. [ ] Navigate to "Reviews" tab
3. [ ] Verify "Pending Reviews" section appears
4. [ ] See the review submitted by customer
5. [ ] Click "Approve" button
6. [ ] Verify review moves to "All Reviews" section
7. [ ] Verify review is now publicly visible

### Test: Customer Receives Coupon
1. [ ] Logout and login as customer
2. [ ] Navigate to "My Reviews"
3. [ ] Verify approved review now shows:
   - Status: "Approved"
   - Coupon code: `TRAP-XXXX-XXXX`
   - Discount amount: `$4.00 off next order`
4. [ ] Copy the coupon code for checkout test

### Test: Chef Review Rejection
1. [ ] Login as Chef
2. [ ] Submit another review as customer (use different order)
3. [ ] As chef, click "Reject" on the new review
4. [ ] Verify review is removed/hidden
5. [ ] Verify customer does **not** receive a coupon

---

## 4. Order System & Order Numbers 📦

### Test: Placing an Order
1. [ ] Login as customer
2. [ ] Go to Menu
3. [ ] Add 2-3 dishes to cart
4. [ ] Click cart icon
5. [ ] Click "Checkout"
6. [ ] Verify order number is displayed (e.g., Order #1, Order #2)
7. [ ] Complete payment (Stripe test card: `4242 4242 4242 4242`)
8. [ ] Verify order confirmation shows order number

### Test: Order Number Display
1. [ ] Navigate to "Orders" page
2. [ ] Verify each order shows `Order #X` (not UUID)
3. [ ] Click on an order
4. [ ] Verify order detail page shows `Order #X`

### Test: Chef Order Management
1. [ ] Login as Chef
2. [ ] Go to "Orders" tab
3. [ ] Verify all orders display with order numbers
4. [ ] Verify order numbers increment sequentially

### Test: Chef Archive Orders
1. [ ] As Chef, on "Orders" page
2. [ ] Mark an order as "COMPLETED" or "CANCELLED"
3. [ ] Click "Archive Completed Orders" button
4. [ ] Confirm archive action
5. [ ] Verify completed/cancelled orders disappear from main list
6. [ ] Check "Show Archived Orders" checkbox
7. [ ] Verify archived orders appear

### Test: Chef Reset Order Numbers
1. [ ] As Chef, on "Orders" page
2. [ ] Click "Reset Order Numbers" button
3. [ ] Confirm reset action
4. [ ] Place a new test order
5. [ ] Verify new order starts at `Order #1`

---

## 5. Checkout & Payment 💳

### Test: Cash on Pickup Removed
1. [ ] Login as customer
2. [ ] Add items to cart
3. [ ] Go to Checkout
4. [ ] Verify **no "Pay with Cash on Pickup" option**
5. [ ] Verify only Stripe payment form is available

### Test: Applying Coupon at Checkout
1. [ ] Have a valid coupon code (from approved review)
2. [ ] Add items to cart (total should be > $4)
3. [ ] Go to Checkout
4. [ ] Enter coupon code in "Coupon Code" field
5. [ ] Click "Apply Coupon"
6. [ ] Verify success message: "Coupon applied successfully!"
7. [ ] Verify discount is shown: `-$4.00`
8. [ ] Verify total is reduced by $4
9. [ ] Complete payment
10. [ ] After order, verify coupon is marked as "used" in My Reviews

### Test: Invalid Coupon Handling
1. [ ] At checkout, enter invalid coupon: `INVALID-CODE`
2. [ ] Click "Apply Coupon"
3. [ ] Verify error message appears
4. [ ] Verify total is **not** reduced

### Test: Apple Pay (if configured)
1. [ ] On Safari/iOS device
2. [ ] Add items to cart
3. [ ] Go to Checkout
4. [ ] Verify "Apple Pay" button appears (if Stripe configured)
5. [ ] Test Apple Pay flow (requires real device and Apple Pay setup)

---

## 6. Dish Requests 📝

### Test: Requests Visibility (Logged-Out)
1. [ ] Logout
2. [ ] Try navigating to `/dish-requests`
3. [ ] Verify redirect to login page
4. [ ] Verify "Requests" tab is **not visible** in navigation

### Test: Requests Visibility (Logged-In)
1. [ ] Login as customer
2. [ ] Verify "Requests" tab **is visible** in navigation
3. [ ] Click "Requests" tab
4. [ ] Verify dish requests page loads
5. [ ] Test creating a new dish request
6. [ ] Test voting on existing requests

---

## 7. Email Notifications 📧

### Test: Order Confirmation Email
1. [ ] Complete an order
2. [ ] Check email inbox for order confirmation
3. [ ] Verify email contains:
   - Order number (e.g., Order #5)
   - Order items
   - Total amount
   - Pickup instructions

### Test: Review Approval Email (if implemented)
1. [ ] Submit a review as customer
2. [ ] Approve as chef
3. [ ] Check customer's email for approval notification
4. [ ] Verify email contains coupon code

---

## 8. Edge Cases & Error Handling 🛡️

### Test: Review Eligibility Rules
1. [ ] Try to review an order older than 30 days
2. [ ] Verify error: "Order is too old to review"
3. [ ] Try to review the same order twice
4. [ ] Verify error: "You have already reviewed this order"
5. [ ] Try to review an incomplete order
6. [ ] Verify error: "Order must be completed and paid"

### Test: Coupon Restrictions
1. [ ] Try to use an already-used coupon
2. [ ] Verify error: "Coupon has already been used"
3. [ ] Try to use someone else's coupon code
4. [ ] Verify error: "Invalid coupon" or ownership check

### Test: Session Persistence
1. [ ] Login as customer
2. [ ] Refresh the page
3. [ ] Verify user remains logged in
4. [ ] Close browser and reopen
5. [ ] Navigate to app
6. [ ] Verify user is still logged in (within token expiry)

---

## 🎯 Key Changes Summary

### ✅ Completed Features

1. **Landing Page**: Menu is now the default page (removed HomePage)
2. **Navigation**: "Reviews" replaced "Home" in customer nav
3. **Reviews System**: 
   - Public review viewing (logged-out users)
   - Write reviews for completed orders
   - Chef approval workflow
   - $4 coupon generation upon approval
4. **Coupons**: 
   - Auto-generated upon review approval
   - Applied at checkout
   - Fixed $4 discount
   - No expiration
5. **Order Numbers**: 
   - Sequential numbering (Order #1, #2, etc.)
   - Displayed everywhere (UI, emails, chef view)
   - Chef can reset counter
   - Chef can archive old orders
6. **Payment**: 
   - Removed "Cash on Pickup"
   - Apple Pay enabled (requires Stripe config)
   - Coupon discount integration
7. **Requests Protection**: 
   - Only visible to logged-in users
   - Redirects to login if accessed while logged out

---

## 🐛 Known Issues / Notes

- **Apple Pay**: Requires Stripe account configuration and testing on Safari/iOS
- **Email Templates**: May need to be updated with order number display
- **Review Timing**: 30-day window for review eligibility is hardcoded
- **Guest Users**: May have limited review capabilities (intentional)

---

## 🚀 Next Steps

After completing all tests:

1. Note any failures or unexpected behavior
2. Check browser console for errors (F12)
3. Check backend terminal for API errors
4. Verify database state in Prisma Studio if issues arise

---

## 📞 Support

If any tests fail, provide:
- Test step number
- Expected vs. actual behavior
- Screenshots (if UI issue)
- Browser console errors
- Backend terminal errors

---

**Testing Date:** ___________  
**Tested By:** ___________  
**Overall Status:** ⬜ PASS | ⬜ FAIL
