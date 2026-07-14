# Review System Update: Per-Dish Reviews

## Changes Implemented

### Database Schema Updates

**File:** `backend/prisma/schema.prisma`

**Changes:**
1. Added `dishId` field to Review model (required, links to specific dish)
2. Added `orderItemId` field (optional, for reference)
3. Added `dishName` field (single dish name, replaces dishNames array)
4. Kept `dishNames` field (nullable, for backward compatibility)
5. Removed `@@unique([orderId])` constraint
6. Added `@@unique([orderId, dishId])` constraint (one review per dish per order)
7. Added `dish` relation to Review model
8. Added `reviews` relation to Dish model
9. Added index on `dishId`

### Backend Updates

**Files Modified:**
1. `backend/src/controllers/review.controller.ts`
   - Updated `getEligibleOrders` to filter out dishes that already have reviews
   - Updated `createReview` to accept `dishId` and validate dish belongs to order
   - Updated all review queries to include `dish` relation
   - Changed validation to check per-dish reviews instead of per-order

2. `backend/src/routes/review.routes.ts`
   - Added `dishId` validation requirement to review creation route

**Migration Scripts Created:**
1. `backend/scripts/add-dish-review-columns.sql` - SQL migration script
2. `backend/scripts/migrate-reviews-to-dish-based.ts` - TypeScript migration script

### Frontend Updates

**Files Modified:**
1. `frontend/src/pages/ReviewFormPage.tsx`
   - Added dish selection step (select dish from order)
   - Pre-selects order from URL params (`?orderId=xxx`)
   - Shows only dishes that haven't been reviewed
   - Updated API call to include `dishId`

2. `frontend/src/pages/OrdersPage.tsx`
   - Added "Write Review" button for completed/paid orders
   - Button links to `/reviews/new?orderId={orderId}`
   - Shows indicator if all dishes have been reviewed
   - Checks eligible orders to determine if review button should appear

3. `frontend/src/pages/ReviewsPage.tsx`
   - Updated to display `dishName` (single dish) instead of `dishNames` array
   - Backward compatible with old reviews

4. `frontend/src/pages/MyReviewsPage.tsx`
   - Updated to display `dishName` (single dish) instead of `dishNames` array
   - Backward compatible with old reviews

5. `frontend/src/pages/chef/ChefReviewsPage.tsx`
   - Updated to display `dishName` (single dish) instead of `dishNames` array
   - Backward compatible with old reviews

6. `frontend/src/types/index.ts`
   - Updated Review interface to include `dishId`, `orderItemId`, `dishName`
   - Kept `dishNames` as optional for backward compatibility
   - Added `dish` relation type

## Migration Required

**Before deploying, you must run the database migration:**

### Option 1: Using SQL Script (Recommended for Production)

1. Connect to your Render database shell or use psql
2. Run the SQL migration:
   ```bash
   psql $DATABASE_URL -f backend/scripts/add-dish-review-columns.sql
   ```
3. Run the TypeScript migration to populate existing reviews:
   ```bash
   cd backend
   npx tsx scripts/migrate-reviews-to-dish-based.ts
   ```

### Option 2: Using Prisma Migrate (Development)

```bash
cd backend
npx prisma migrate dev --name add_dish_reviews
npx tsx scripts/migrate-reviews-to-dish-based.ts
```

### Option 3: Using Prisma DB Push (Quick, but less safe)

```bash
cd backend
npx prisma db push --accept-data-loss
npx tsx scripts/migrate-reviews-to-dish-based.ts
```

**Important:** The migration script will:
- Add new columns (nullable initially)
- Update existing reviews to have `dishId` (uses first dish from `dishNames` array)
- Update constraints
- After migration, you can make `dishId` and `dishName` NOT NULL if desired

## How It Works Now

### Customer Flow

1. **Customer places order** with multiple dishes
2. **Customer pays** for order
3. **Chef marks order as COMPLETED**
4. **On Orders page**, customer sees "Write Review" button
5. **Clicks button** → Navigates to `/reviews/new?orderId=xxx`
6. **Review form** pre-selects the order
7. **Customer selects dish** from order (only unreviewed dishes shown)
8. **Customer writes review** for that specific dish
9. **Can review other dishes** from same order separately

### Review Creation

- Each dish can be reviewed once per order
- Multiple reviews can exist for the same order (one per dish)
- Reviews are linked to specific dishes via `dishId`
- Backend validates that dish exists in order
- Backend prevents duplicate reviews for same dish/order combination

### Chef Approval

- Chef sees dish-specific reviews
- Each review approval generates a $4 coupon
- Multiple coupons possible per order (one per approved dish review)

## Testing Checklist

After deployment and migration:

1. **Create order with multiple dishes**
2. **Complete and pay for order**
3. **View Orders page** → Should see "Write Review" button
4. **Click button** → Should navigate to review form with order pre-selected
5. **Select dish** → Should show only dishes that haven't been reviewed
6. **Submit review** → Should succeed
7. **Try to review same dish again** → Should fail with "already reviewed" error
8. **Review different dish from same order** → Should succeed
9. **View Reviews page** → Should show dish-specific reviews
10. **Chef approves review** → Should generate coupon

## Backward Compatibility

- Old reviews with `dishNames` array will still display correctly
- Frontend checks for both `dishName` (new) and `dishNames` (old)
- Migration script converts old reviews to new format
- No data loss during migration

## Notes

- TypeScript compilation may show errors locally if Prisma client isn't regenerated
- Render will regenerate Prisma client during build (`prisma db push` runs in build command)
- Migration scripts handle existing reviews gracefully
- All changes are backward compatible with existing review data
