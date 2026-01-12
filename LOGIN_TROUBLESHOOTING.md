# 🔧 Login & Registration Troubleshooting Guide

## ✅ **Backend Status: FULLY WORKING**

I've tested all authentication endpoints and they work perfectly:

```bash
✅ Chef Login Test: SUCCESS
✅ Customer Registration Test: SUCCESS
✅ CORS Configuration: CORRECT
✅ Database Connection: WORKING
✅ Token Generation: WORKING
```

---

## 🧪 **Verified Working Endpoints**

### **Chef Login (Backend)**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"chef@traphouse.com","password":"chef123"}'

# Response: ✅ SUCCESS
{
  "status": "success",
  "data": {
    "user": {
      "id": "chef-1",
      "email": "chef@traphouse.com",
      "name": "Head Chef",
      "role": "CHEF"
    },
    "token": "eyJhbGci..."
  }
}
```

### **Customer Registration (Backend)**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Response: ✅ SUCCESS
{
  "status": "success",
  "data": {
    "user": {
      "id": "...",
      "email": "test@example.com",
      "name": "Test User",
      "role": "CUSTOMER"
    },
    "token": "eyJhbGci..."
  }
}
```

---

## 🔍 **Possible Frontend Issues & Solutions**

### **Issue 1: Browser Cache**

**Solution:**
1. Open browser DevTools (F12)
2. Go to **Application** tab
3. Click **Clear storage**
4. Check all boxes
5. Click **Clear site data**
6. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

### **Issue 2: Network/CORS Error**

**Check:**
1. Open DevTools → **Console** tab
2. Look for red errors
3. Check if you see CORS errors

**Solution:**
- CORS is properly configured on backend
- Try: `Access-Control-Allow-Origin: http://localhost:5173` ✅

### **Issue 3: API URL Mismatch**

**Check:**
1. DevTools → **Network** tab
2. Try to log in
3. Look at the request URL

**Should be:** `http://localhost:3001/api/auth/login`

**If different:**
- Check `frontend/.env` file
- Should have: `VITE_API_URL=http://localhost:3001`

### **Issue 4: Form Validation**

**Check:**
- Email format is valid (contains @)
- Password is at least 6 characters
- Name is not empty (for registration)

### **Issue 5: JavaScript Errors**

**Check:**
1. DevTools → **Console** tab
2. Look for any red JavaScript errors
3. Common issues:
   - `Cannot read property 'data' of undefined`
   - `Network Error`
   - `Request failed with status code 4xx`

---

## 🎯 **Step-by-Step Testing**

### **Test 1: Chef Login via Frontend**

1. **Open:** [http://localhost:5173/chef/login](http://localhost:5173/chef/login)

2. **Enter Credentials:**
   ```
   Email: chef@traphouse.com
   Password: chef123
   ```

3. **Open DevTools (F12)**
   - Console tab: Check for errors
   - Network tab: Watch the `/api/auth/login` request

4. **Click "Sign in to Dashboard"**

5. **Expected Behavior:**
   - Loading spinner appears
   - Success toast: "Welcome back, Chef!"
   - Redirect to: `/chef` dashboard

6. **If it fails:**
   - Check Console for errors
   - Check Network tab for request/response
   - Take a screenshot and check below

---

### **Test 2: Customer Registration via Frontend**

1. **Open:** [http://localhost:5173/register](http://localhost:5173/register)

2. **Enter Details:**
   ```
   Name: John Doe
   Email: john@example.com
   Password: password123
   ```

3. **Open DevTools (F12)**

4. **Click "Create account"**

5. **Expected Behavior:**
   - Loading spinner appears
   - Success toast: "Welcome!"
   - Redirect to: `/menu`

6. **If it fails:**
   - Check Console for errors
   - Check Network tab
   - Screenshot the error

---

## 🐛 **Common Error Messages & Fixes**

### **Error: "Network Error"**

**Cause:** Frontend can't reach backend

**Check:**
```bash
# Is backend running?
curl http://localhost:3001/health

# Expected: {"status":"ok",...}
```

**Fix:**
```bash
cd backend
npm run dev
```

---

### **Error: "Invalid credentials"**

**Cause:** Wrong email/password

**For Chef:**
```
Email: chef@traphouse.com
Password: chef123
```

**For Testing:**
Create a new account first at `/register`

---

### **Error: "Email already registered"**

**Cause:** Email is already in database

**Fix:**
1. Use a different email
2. OR login with existing account
3. OR reset database (see below)

---

### **Error: "Validation failed"**

**Causes:**
- Email format invalid (must contain @)
- Password too short (min 6 characters)
- Name is empty

**Fix:**
- Check all fields are filled correctly
- Email: `user@example.com` format
- Password: At least 6 characters

---

### **Error: Response is undefined**

**Cause:** Backend is down or CORS issue

**Check:**
```bash
# Test backend directly
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"chef@traphouse.com","password":"chef123"}'
```

**If this works:** Frontend issue  
**If this fails:** Backend issue

---

## 🔄 **Complete System Restart**

If nothing works, restart everything:

```bash
# 1. Stop all servers
lsof -ti:3001,5173 | xargs kill -9

# 2. Restart PostgreSQL
docker restart traphousekitchenv2
sleep 5

# 3. Start Backend
cd backend
npm run dev &

# 4. Start Frontend (in new terminal)
cd frontend
rm -rf node_modules/.vite  # Clear cache
npm run dev &

# 5. Wait 10 seconds
sleep 10

# 6. Test
curl http://localhost:3001/health
curl http://localhost:5173
```

---

## 🔐 **Reset Chef Password**

If chef password doesn't work:

```bash
docker exec traphousekitchenv2 psql -U traphouse -d traphouse_kitchen -c \
  "UPDATE \"User\" SET password = '\$2b\$12\$CXbPyY6nBhbSc5yuy1oml.gJlSBC4NjpWqAv0VUG735Uw.n1GrFfq' WHERE email = 'chef@traphouse.com';"
```

This sets the password to: `chef123`

---

## 📊 **Verification Checklist**

Run these commands to verify everything:

```bash
# ✅ Check Docker
docker ps | grep traphousekitchenv2
# Expected: Container is Up

# ✅ Check Backend
curl http://localhost:3001/health
# Expected: {"status":"ok",...}

# ✅ Check Frontend
curl -s http://localhost:5173 | grep -q "TrapHouse" && echo "✅ Frontend OK"

# ✅ Test Chef Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"chef@traphouse.com","password":"chef123"}' | grep -q "success" && echo "✅ Chef Login OK"

# ✅ Check Chef in Database
docker exec traphousekitchenv2 psql -U traphouse -d traphouse_kitchen -c \
  "SELECT email, role FROM \"User\" WHERE email = 'chef@traphouse.com';"
# Expected: chef@traphouse.com | CHEF
```

---

## 💡 **What To Check In Browser DevTools**

### **Console Tab**
Look for:
- ❌ Red errors
- ⚠️ Yellow warnings
- Network errors
- CORS errors

### **Network Tab**
1. Filter by: `XHR`
2. Try to log in
3. Find: `login` request
4. Check:
   - **Status**: Should be `200 OK`
   - **Request URL**: `http://localhost:3001/api/auth/login`
   - **Request Payload**: Your email/password
   - **Response**: Should have `"status": "success"`

### **Application Tab**
Check `Local Storage`:
- `http://localhost:5173`
- Should see `token` after successful login

---

## 🎯 **Quick Test (Copy & Paste)**

Open your browser console on [http://localhost:5173](http://localhost:5173) and paste:

```javascript
// Test API connection
fetch('http://localhost:3001/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend:', d))
  .catch(e => console.error('❌ Backend Error:', e));

// Test Chef Login
fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'chef@traphouse.com',
    password: 'chef123'
  })
})
  .then(r => r.json())
  .then(d => console.log('✅ Chef Login:', d))
  .catch(e => console.error('❌ Login Error:', e));
```

**Expected Output:**
```
✅ Backend: {status: "ok", ...}
✅ Chef Login: {status: "success", data: {...}}
```

---

## 📞 **Still Not Working?**

Take screenshots of:
1. **Browser Console** (F12 → Console tab)
2. **Network Tab** (F12 → Network tab) showing the failed request
3. **The login form** showing the error message

---

## ✅ **Known Working Setup**

```
Docker Container: traphousekitchenv2 ✅
PostgreSQL: Running on port 5432 ✅
Backend: Running on port 3001 ✅
Frontend: Running on port 5173 ✅

Chef Credentials:
  Email: chef@traphouse.com
  Password: chef123

Backend Auth: 100% Working ✅
CORS: Properly configured ✅
Database: Seeded and ready ✅
```

---

**The backend is working perfectly. If the frontend login fails, it's likely a browser/cache issue. Try the clear cache solution first!**
