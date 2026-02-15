# Quick Start Guide - Review System Improvements

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

This will install:
- `vitest` - Test runner
- `supertest` - HTTP testing library
- `@types/supertest` - TypeScript types

### 2. Update Environment Variables
```bash
# Add to backend/.env
echo "REVIEW_WINDOW_DAYS=30" >> backend/.env
```

### 3. Start Docker Desktop
Open Docker Desktop and wait for it to start (whale icon in menu bar should be active).

### 4. Run Tests
```bash
# Option A: Use the all-in-one script (Recommended)
./run-tests.sh

# Option B: Manual setup
./setup-test-db.sh
cd backend && npm test
cd .. && ./cleanup-test-db.sh
```

See `DOCKER_TESTING.md` for detailed Docker setup instructions.

---

## 🧪 Testing

### Run Integration Tests
```bash
cd backend
npm test
```

### What Gets Tested
- ✅ Order status transitions set `completedAt`
- ✅ Completed orders appear in eligible-orders
- ✅ Review creation for completed orders
- ✅ Duplicate review prevention
- ✅ 30-day review window enforcement
- ✅ Chef approval generates $4 coupons
- ✅ Per-dish review status in orders endpoint

### Test Output
```
✓ Review Flow Integration Tests (12 tests)
  ✓ Order Status and completedAt
    ✓ should set completedAt when chef marks order as COMPLETED
    ✓ should return completed order in eligible-orders endpoint
  ✓ Review Creation
    ✓ should allow creating review for completed order
    ✓ should not allow reviewing same dish twice
    ...
```

---

## 📦 What Changed

### Backend
- ✅ Centralized order status service already in use
- ✅ Configurable 30-day review window
- ✅ Orders endpoint includes per-dish review status
- ✅ Integration tests for review flow

### Frontend
- ✅ Per-dish review badges (Reviewed, Pending, Write Review)
- ✅ Error states with retry buttons
- ✅ Enhanced empty state messages
- ✅ Direct links to review specific dishes

---

## 🎯 Key Features

### 1. Per-Dish Review Status
Orders page now shows inline status for each dish:
- 🟢 "Reviewed • Coupon Earned" (approved reviews)
- 🟡 "Pending Approval" (submitted, awaiting chef)
- 🔵 "Write Review" link (eligible dishes)

### 2. Configurable Review Window
Change the review window without code changes:
```env
REVIEW_WINDOW_DAYS=7   # 7 days
REVIEW_WINDOW_DAYS=30  # 30 days (default)
REVIEW_WINDOW_DAYS=90  # 90 days
```

### 3. Error Recovery
Users see clear error messages with retry buttons:
- Network failures
- API timeouts
- Server errors

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REVIEW_WINDOW_DAYS` | 30 | Days after completion customers can review |

### Production (Render)
Already configured in `render.yaml`:
```yaml
- key: REVIEW_WINDOW_DAYS
  value: 30
```

---

## 📊 Before vs After

### Before
- ❌ Order-level "Write Review" button (confusing)
- ❌ No visibility into review status
- ❌ Silent failures when API fails
- ❌ No way to know which dishes reviewed
- ❌ Hardcoded 30-day window

### After
- ✅ Per-dish review badges with clear status
- ✅ Inline "Write Review" links per dish
- ✅ Error banners with retry buttons
- ✅ Visual feedback: Pending → Approved → Coupon Earned
- ✅ Configurable review window via env var

---

## 🐛 Troubleshooting

### Tests Failing
```bash
# Clean node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

### Database Issues
```bash
# Reset test data (tests clean up automatically)
cd backend
npx prisma db push --force-reset
npm run prisma:seed
```

### Frontend Not Showing Badges
1. Check browser console for errors
2. Verify backend includes review data:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/orders
   ```
3. Look for `reviews` array in order items

---

## 📝 Next Steps

1. ✅ Run tests: `npm test`
2. ✅ Update `.env`: Add `REVIEW_WINDOW_DAYS=30`
3. ✅ Test manually: Create order → Complete → Review
4. ✅ Deploy to production
5. ✅ Monitor review submissions

---

## 💡 Tips

- Tests use the same database as dev, but clean test data automatically
- Review badges appear only on COMPLETED + PAID orders
- Chef approval generates $4 coupon automatically
- Orders older than window are excluded from eligible-orders

---

## 📚 Files Reference

### Tests
- `backend/tests/integration/review-flow.test.ts` - Main test suite
- `backend/tests/setup.ts` - Test environment setup
- `backend/vitest.config.ts` - Vitest configuration

### Services
- `backend/src/services/order.service.ts` - Centralized status logic

### Controllers
- `backend/src/controllers/review.controller.ts` - Review window config

### Frontend
- `frontend/src/pages/OrdersPage.tsx` - Per-dish badges
- `frontend/src/pages/ReviewFormPage.tsx` - Error handling
- `frontend/src/types/index.ts` - Type definitions

---

## ✅ Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Environment variable set (`REVIEW_WINDOW_DAYS=30`)
- [ ] Tests passing (`npm test`)
- [ ] Manual testing complete
- [ ] Frontend shows per-dish badges
- [ ] Error states working with retry
- [ ] Ready for production deployment

---

**Need Help?** Check the full implementation summary in `IMPLEMENTATION_SUMMARY.md`
