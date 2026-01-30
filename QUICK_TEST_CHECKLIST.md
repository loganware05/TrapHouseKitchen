# Quick Test Checklist - TrapHouse Kitchen v2

## 🚨 Critical Fix Applied
**CORS Issue Resolved** - Backend now accepts frontend on any localhost port (5173, 5174, 3000)

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Start Servers (2 terminals)

**Terminal 1 - Backend:**
```bash
cd "/Users/loganware/Documents/Buisness/TrapHouseKitchen v2/backend"
npm run dev
```
Wait for: `🚀 Server running on port 3001`

**Terminal 2 - Frontend:**
```bash
cd "/Users/loganware/Documents/Buisness/TrapHouseKitchen v2/frontend"
npm run dev
```
Note the URL (likely `http://localhost:5173` or `5174`)

---

### Step 2: Test Landing Page & Navigation
1. Open browser to frontend URL
2. ✅ Verify **Menu page** loads (not a home page)
3. ✅ See "Reviews" tab in navigation
4. ✅ "Requests" tab should NOT be visible (you're not logged in)
5. ✅ "Login" button in top-right

---

### Step 3: Test Registration & Login
1. Click "Login" button
2. Click "create a new account"
3. Fill form:
   - Name: `Test User`
   - Email: `test@customer.com`
   - Password: `password123`
   - Confirm: `password123`
4. Click "Create account"
5. ✅ Should see success message
6. ✅ Should redirect to Menu
7. ✅ Should see your name in top-right
8. ✅ "Requests" tab now visible

**Result:** If login works, CORS fix is successful! ✅

---

### Step 4: Test Public Reviews
1. Logout (click logout icon)
2. Click "Reviews" tab
3. ✅ Can view reviews without being logged in
4. ✅ "Write Review" button is hidden/prompts login

---

### Step 5: Test Protected Routes
1. While logged out, try to navigate to: `/dish-requests`
2. ✅ Should redirect to login page
3. Login again
4. ✅ Now can access `/dish-requests`

---

### Step 6: Test Order & Review Flow

**Part A: Place an Order**
1. Login as customer
2. Go to Menu
3. Add 2+ dishes to cart
4. Click cart icon → Checkout
5. Use test card: `4242 4242 4242 4242` (any future date, any CVC/ZIP)
6. Complete payment
7. ✅ Order confirmation shows `Order #X` (not UUID)
8. ✅ Order appears in "Orders" page

**Part B: Write a Review**
1. Go to "Reviews" → "Write a Review"
2. Select your recent order
3. Give 5 stars ⭐⭐⭐⭐⭐
4. Comment: `Amazing food!`
5. Submit review
6. ✅ See "Pending Approval" status in "My Reviews"
7. ✅ No coupon code yet

---

### Step 7: Test Chef Review Approval

**Setup Chef Account (if needed):**
```bash
# In a database tool or Prisma Studio
# Update any user's role to 'CHEF' or 'ADMIN'
npx prisma studio
# Navigate to User table → Edit a user → Set role to CHEF
```

**Test Approval:**
1. Logout and login as Chef
2. Go to "Reviews" tab
3. ✅ See pending review in "Pending Reviews" section
4. Click "Approve"
5. ✅ Review moves to "All Reviews"
6. ✅ Review now public

**Customer Receives Coupon:**
1. Logout and login as customer
2. Go to "My Reviews"
3. ✅ See approved review
4. ✅ See coupon code: `TRAP-XXXX-XXXX`
5. ✅ Copy the code

---

### Step 8: Test Coupon at Checkout
1. As customer, add items to cart (total > $4)
2. Go to Checkout
3. Enter coupon code
4. Click "Apply Coupon"
5. ✅ See success message
6. ✅ See `-$4.00` discount
7. ✅ Total reduced by $4
8. Complete payment
9. ✅ Order shows discount applied
10. Go to "My Reviews"
11. ✅ Coupon shows as "Used"

---

### Step 9: Test Order Management (Chef)
1. Login as Chef
2. Go to "Orders" tab
3. ✅ All orders show `Order #1`, `Order #2`, etc. (not UUIDs)
4. Mark some orders as "Completed"
5. Click "Archive Completed Orders"
6. ✅ Completed orders disappear
7. Check "Show Archived Orders"
8. ✅ Archived orders reappear
9. Click "Reset Order Numbers"
10. ✅ Confirm reset
11. Place new order
12. ✅ New order is `Order #1`

---

### Step 10: Verify Cash Payment Removed
1. As customer, go to Checkout with items
2. ✅ No "Pay with Cash on Pickup" button
3. ✅ Only Stripe payment form visible

---

## 🎯 Pass/Fail Criteria

### ✅ All Tests Pass If:
- Landing page is Menu (not Home)
- Can register and login
- Reviews visible to public
- Can write and approve reviews
- Coupons generated and work at checkout
- Order numbers are sequential (#1, #2, #3...)
- Chef can archive and reset orders
- Requests hidden from logged-out users
- No cash payment option
- CORS not blocking requests

### ❌ Test Fails If:
- Login doesn't work (CORS error in console)
- Reviews don't appear
- Coupons don't generate
- Order numbers show UUIDs
- Cash payment still appears
- Can access requests while logged out

---

## 🐛 Common Issues & Fixes

### Issue: "Can't login" or "Network Error"
**Check:**
1. Backend running? → `curl http://localhost:3001/health`
2. CORS error in browser console? → Backend should show updated CORS
3. Frontend connecting to right API? → Check `VITE_API_URL` in console

**Fix:**
```bash
# Restart backend to apply CORS fix
cd backend
npm run dev
```

### Issue: "No reviews show up"
**Check:**
1. Are there any approved reviews? → Chef must approve first
2. API error in console? → Check backend terminal

### Issue: "Coupon doesn't work"
**Check:**
1. Is review approved? → Coupons only generated on approval
2. Already used? → Can't reuse coupons
3. Order total < $4? → Discount can't exceed total

### Issue: "Order numbers not sequential"
**Fix:**
```bash
# Run seed script
cd backend
npx tsx prisma/seed-order-numbers.ts
```

---

## 📊 Expected Console Output

### Backend (should see):
```
🚀 Server running on port 3001
📱 Environment: development
GET /api/reviews 200 XX ms
POST /api/auth/login 200 XX ms
```

### Frontend (should NOT see):
```
❌ CORS error
❌ Network failed
❌ 401 Unauthorized (after login)
```

---

## 📞 If Tests Fail

Provide these details:
1. Which step failed?
2. Browser console errors (F12)
3. Backend terminal output
4. Screenshot (if UI issue)

---

## ✅ Success!

If all 10 steps pass, the implementation is complete and working!

**Next Steps:**
1. Test with real chef/customer workflows
2. Test Apple Pay (requires Safari/iOS)
3. Deploy to production
4. Celebrate! 🎉

---

**Quick Test Time:** ~10 minutes  
**Full Test Time:** ~30 minutes (see TESTING_GUIDE.md)  
**Created:** January 22, 2026
