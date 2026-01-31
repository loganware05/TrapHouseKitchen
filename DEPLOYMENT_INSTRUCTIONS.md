# Deployment Instructions for Render

## Immediate Fix: Add Missing Database Columns

Your database is missing `orderNumber` and `isArchived` columns. Run this SQL script immediately:

### Option 1: Run SQL Script in Render Shell (Recommended)

1. Go to Render Dashboard → `traphousekitchen-api` → **Shell** tab
2. Run this command:
   ```bash
   cd backend && psql $DATABASE_URL -f scripts/add-order-columns.sql
   ```

### Option 2: Copy SQL Commands Manually

If psql is not available, copy the contents of `backend/scripts/add-order-columns.sql` and run them directly in your database.

### Option 3: Use Migration Script

In Render Shell:
```bash
cd backend
npm run migrate:add-order-fields
```

## Long-term Fix: Update Render Dashboard Commands

Since your Render services use manually configured commands (not render.yaml), update them in the dashboard:

### Backend Service (`traphousekitchen-api`)

1. Go to Render Dashboard → `traphousekitchen-api` → **Settings** → **Build & Deploy**

2. **Update Build Command** to:
   ```bash
   cd backend && npm install && npx prisma db push --accept-data-loss && npm run build
   ```

3. **Update Start Command** to:
   ```bash
   cd backend && npm run prisma:seed || true && npm start
   ```

This ensures:
- Database schema is synced before build (`prisma db push`)
- Prisma client is regenerated with correct schema
- Seed data is loaded on startup
- Future schema changes are automatically applied

### Frontend Service (`traphousekitchen-web`)

No changes needed - frontend build command is already correct.

## What Changed

### Dish Deletion Behavior
- **Before**: Hard delete (removed from database) - failed if dish had orders
- **After**: Soft delete (sets status to UNAVAILABLE) - preserves order history
- Chefs can now "delete" any dish, even if it has been ordered before
- Order history remains intact with dish references

### Database Schema
- Added `orderNumber` column (auto-incrementing)
- Added `isArchived` column (defaults to false)
- These columns are required for order creation and management

## Verification

After running the SQL script or updating commands:

1. **Test Checkout**: Try creating an order - should work without errors
2. **Test Dish Deletion**: Try deleting an old dish - should set it to unavailable
3. **Check Logs**: Verify no "column does not exist" errors

## Troubleshooting

If you still see errors:
- Check Render build logs to ensure `prisma db push` ran successfully
- Verify database connection is working during build
- Check that columns were actually added: `SELECT column_name FROM information_schema.columns WHERE table_name = 'Order';`
