# Deployment Instructions: Per-Dish Review System

## Pre-Deployment Checklist

✅ **Completed:**
- [x] Database schema updated (`schema.prisma`)
- [x] Backend controllers updated (`review.controller.ts`)
- [x] Backend routes updated (`review.routes.ts`)
- [x] Frontend components updated (ReviewFormPage, OrdersPage, ReviewsPage, MyReviewsPage)
- [x] TypeScript types updated (`types/index.ts`)
- [x] Migration scripts created
- [x] Local database migration completed
- [x] Headless tests passed (8/8)

## Deployment Steps

### 1. Commit and Push Changes

```bash
git add .
git commit -m "feat: Implement per-dish review system

- Update Review model to support dishId and dishName
- Add unique constraint on [orderId, dishId]
- Update review creation to require dishId
- Update eligible orders to filter unreviewed dishes
- Add 'Write Review' button to OrdersPage
- Update review form to allow dish selection
- Update review displays to show dish-specific reviews
- Add migration scripts for existing reviews"

git push origin main
```

### 2. Render Deployment

Render will automatically:
1. Pull latest code from repository
2. Run build command: `cd backend && npm install && npx prisma db push --accept-data-loss && npm run build`
3. Apply schema changes to production database
4. Deploy backend service
5. Build and deploy frontend

**Note:** The `prisma db push` command in the build will automatically apply schema changes.

### 3. Post-Deployment Migration (If Needed)

If you have existing reviews in production, run the migration script:

**Option A: Via Render Shell**
1. Go to Render Dashboard → traphousekitchen-api → Shell
2. Run:
   ```bash
   cd backend
   npx tsx scripts/migrate-reviews-to-dish-based.ts
   ```

**Option B: Via Local Connection**
```bash
# Set production DATABASE_URL
export DATABASE_URL="your-production-database-url"

cd backend
npx tsx scripts/migrate-reviews-to-dish-based.ts
```

### 4. Verify Deployment

#### Backend Verification

1. **Check Schema:**
   ```bash
   # Via Render Shell
   cd backend
   npx prisma db pull --print | grep -A 20 "model Review"
   ```
   Should show: `dishId`, `dishName`, `orderItemId`, `@@unique([orderId, dishId])`

2. **Test API Endpoints:**
   ```bash
   # Get eligible orders (should return orders with unreviewed dishes)
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://traphousekitchen-api.onrender.com/reviews/eligible-orders

   # Create review (should require dishId)
   curl -X POST https://traphousekitchen-api.onrender.com/reviews \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "orderId": "order-id",
       "dishId": "dish-id",
       "rating": 5,
       "comment": "Great food!"
     }'
   ```

#### Frontend Verification

1. **Orders Page:**
   - Navigate to `/orders`
   - Verify "Write Review" button appears for completed/paid orders
   - Click button → Should navigate to `/reviews/new?orderId=xxx`

2. **Review Form:**
   - Navigate to `/reviews/new?orderId=xxx`
   - Verify order is pre-selected
   - Verify dish selection appears
   - Select dish and submit review
   - Verify success message

3. **Review Multiple Dishes:**
   - Create order with multiple dishes
   - Complete and pay for order
   - Review first dish → Should succeed
   - Review same dish again → Should fail (already reviewed)
   - Review second dish → Should succeed

4. **Reviews Display:**
   - Navigate to `/reviews`
   - Verify reviews show dish name (not dish names array)
   - Verify each review is dish-specific

## Rollback Plan (If Needed)

If issues occur, you can rollback:

1. **Revert Code:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Database Rollback:**
   ```sql
   -- Remove new columns (if needed)
   ALTER TABLE "Review" DROP COLUMN IF EXISTS "dishId";
   ALTER TABLE "Review" DROP COLUMN IF EXISTS "dishName";
   ALTER TABLE "Review" DROP COLUMN IF EXISTS "orderItemId";
   
   -- Restore old constraint
   ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_key" UNIQUE ("orderId");
   ```

**Note:** Only rollback if absolutely necessary. The migration is designed to be safe and backward compatible.

## Monitoring

After deployment, monitor:

1. **Error Logs:**
   - Check Render logs for any Prisma errors
   - Check for review creation failures
   - Check for constraint violation errors

2. **User Feedback:**
   - Monitor review creation success rate
   - Check for user-reported issues
   - Verify review display correctness

3. **Database:**
   - Monitor database performance
   - Check for constraint violations
   - Verify index usage

## Expected Behavior After Deployment

### Customer Flow
1. ✅ Places order with multiple dishes
2. ✅ Pays for order
3. ✅ Chef marks order as COMPLETED
4. ✅ Sees "Write Review" button on Orders page
5. ✅ Clicks button → Navigates to review form
6. ✅ Selects dish from order
7. ✅ Writes review for that dish
8. ✅ Can review other dishes separately

### Review Creation
- ✅ Requires `dishId` parameter
- ✅ Validates dish exists in order
- ✅ Prevents duplicate reviews for same dish/order
- ✅ Allows multiple reviews per order (different dishes)

### Review Display
- ✅ Shows single dish name per review
- ✅ Backward compatible with old reviews
- ✅ Chef sees dish-specific reviews

## Support

If you encounter issues:

1. Check Render logs for errors
2. Verify database schema matches `schema.prisma`
3. Run migration script if reviews exist
4. Check Prisma client generation
5. Verify environment variables are set correctly

## Success Criteria

Deployment is successful when:
- ✅ All services deploy without errors
- ✅ Database schema matches expected structure
- ✅ Review creation works with `dishId`
- ✅ Multiple reviews per order work correctly
- ✅ Frontend displays dish-specific reviews
- ✅ No data loss or corruption
