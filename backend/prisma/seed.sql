-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'CHEF', 'ADMIN');

-- CreateEnum
CREATE TYPE "DishStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'SEASONAL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- Insert default allergens
INSERT INTO "Allergen" ("id", "name", "description", "severity", "createdAt", "updatedAt") VALUES
('1', 'Peanuts', 'Tree nuts and peanuts', 'HIGH', NOW(), NOW()),
('2', 'Dairy', 'Milk and dairy products', 'MODERATE', NOW(), NOW()),
('3', 'Gluten', 'Wheat, barley, rye', 'MODERATE', NOW(), NOW()),
('4', 'Shellfish', 'Shrimp, crab, lobster', 'HIGH', NOW(), NOW()),
('5', 'Eggs', 'Eggs and egg products', 'MODERATE', NOW(), NOW()),
('6', 'Soy', 'Soy and soy products', 'LOW', NOW(), NOW()),
('7', 'Fish', 'All fish', 'HIGH', NOW(), NOW()),
('8', 'Sesame', 'Sesame seeds', 'MODERATE', NOW(), NOW());

-- Insert default categories
INSERT INTO "Category" ("id", "name", "description", "displayOrder", "createdAt", "updatedAt") VALUES
('1', 'Appetizers', 'Start your meal right', 0, NOW(), NOW()),
('2', 'Main Courses', 'Hearty main dishes', 1, NOW(), NOW()),
('3', 'Desserts', 'Sweet endings', 2, NOW(), NOW()),
('4', 'Beverages', 'Drinks and refreshments', 3, NOW(), NOW());

-- Create a default chef account (password: chef123)
INSERT INTO "User" ("id", "email", "password", "name", "role", "isGuest", "createdAt", "updatedAt") VALUES
('chef-1', 'chef@traphouse.com', '$2b$12$CXbPyY6nBhbSc5yuy1oml.gJlSBC4NjpWqAv0VUG735Uw.n1GrFfq', 'Head Chef', 'CHEF', false, NOW(), NOW());

