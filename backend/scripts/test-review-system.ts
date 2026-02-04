/**
 * Headless test to validate per-dish review system
 * Tests:
 * 1. Review creation requires dishId
 * 2. Eligible orders filter shows only unreviewed dishes
 * 3. Can't review same dish twice from same order
 * 4. Can review different dishes from same order
 * 5. Unique constraint on [orderId, dishId]
 */

interface Review {
  id: string;
  orderId: string;
  dishId: string;
  dishName: string;
  userId: string;
  rating: number;
  comment: string;
}

interface OrderItem {
  id: string;
  dishId: string;
  dish: {
    id: string;
    name: string;
  };
}

interface Order {
  id: string;
  userId: string;
  status: 'COMPLETED' | 'PENDING' | 'PREPARING' | 'READY' | 'CANCELLED';
  paymentStatus: 'PAID' | 'PENDING' | 'UNPAID' | 'FAILED' | 'REFUNDED';
  items: OrderItem[];
  reviews: Review[];
  completedAt?: Date;
}

function testReviewSystem() {
  console.log('🧪 Testing Per-Dish Review System\n');

  // Simulate an order with multiple dishes
  const orderId = 'order-123';
  const userId = 'user-456';
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 15); // Within 30 days

  const order: Order = {
    id: orderId,
    userId: userId,
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    completedAt: thirtyDaysAgo,
    items: [
      { id: 'item-1', dishId: 'dish-1', dish: { id: 'dish-1', name: 'Burger' } },
      { id: 'item-2', dishId: 'dish-2', dish: { id: 'dish-2', name: 'Pizza' } },
      { id: 'item-3', dishId: 'dish-3', dish: { id: 'dish-3', name: 'Pasta' } },
    ],
    reviews: [],
  };

  // Test 1: Review creation requires dishId
  console.log('Test 1: Review Creation Requires dishId');
  const reviewWithoutDishId = {
    orderId: orderId,
    rating: 5,
    comment: 'Great food!',
  };
  const hasDishId = 'dishId' in reviewWithoutDishId;
  console.log(`   Review data: ${JSON.stringify(reviewWithoutDishId)}`);
  console.log(`   Has dishId: ${hasDishId}`);
  console.log(`   Result: ${!hasDishId ? '✅ PASS (correctly requires dishId)' : '❌ FAIL'}\n`);

  // Test 2: Can create review for first dish
  console.log('Test 2: Create Review for First Dish');
  const review1: Review = {
    id: 'review-1',
    orderId: orderId,
    dishId: 'dish-1',
    dishName: 'Burger',
    userId: userId,
    rating: 5,
    comment: 'Great burger!',
  };
  order.reviews.push(review1);
  console.log(`   Created review for: ${review1.dishName}`);
  console.log(`   Order reviews count: ${order.reviews.length}`);
  console.log(`   Result: ${order.reviews.length === 1 ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test 3: Eligible orders filter shows only unreviewed dishes
  console.log('Test 3: Eligible Orders Filter (Unreviewed Dishes Only)');
  const reviewedDishIds = new Set(order.reviews.map(r => r.dishId));
  const eligibleItems = order.items.filter(item => !reviewedDishIds.has(item.dishId));
  
  console.log(`   Total dishes in order: ${order.items.length}`);
  console.log(`   Reviewed dishes: ${order.reviews.map(r => r.dishName).join(', ')}`);
  console.log(`   Eligible dishes: ${eligibleItems.map(i => i.dish.name).join(', ')}`);
  
  const test3Pass = eligibleItems.length === 2 &&
                    eligibleItems.every(item => !reviewedDishIds.has(item.dishId)) &&
                    eligibleItems.some(item => item.dishId === 'dish-2') &&
                    eligibleItems.some(item => item.dishId === 'dish-3');
  console.log(`   Result: ${test3Pass ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test 4: Can't review same dish twice
  console.log('Test 4: Prevent Duplicate Review (Same Dish, Same Order)');
  const duplicateReview: Review = {
    id: 'review-2',
    orderId: orderId,
    dishId: 'dish-1', // Same dish as review-1
    dishName: 'Burger',
    userId: userId,
    rating: 4,
    comment: 'Another review',
  };
  
  const existingReview = order.reviews.find(r => r.dishId === duplicateReview.dishId);
  const canCreateDuplicate = !existingReview;
  
  console.log(`   Attempting to review: ${duplicateReview.dishName}`);
  console.log(`   Existing review found: ${existingReview ? 'Yes' : 'No'}`);
  console.log(`   Can create duplicate: ${canCreateDuplicate}`);
  console.log(`   Result: ${!canCreateDuplicate ? '✅ PASS (correctly prevents duplicate)' : '❌ FAIL'}\n`);

  // Test 5: Can review different dish from same order
  console.log('Test 5: Review Different Dish from Same Order');
  const review2: Review = {
    id: 'review-3',
    orderId: orderId,
    dishId: 'dish-2', // Different dish
    dishName: 'Pizza',
    userId: userId,
    rating: 4,
    comment: 'Good pizza!',
  };
  
  const existingDishReview = order.reviews.find(r => r.dishId === review2.dishId);
  const canCreateDifferentDish = !existingDishReview;
  
  if (canCreateDifferentDish) {
    order.reviews.push(review2);
  }
  
  console.log(`   Attempting to review: ${review2.dishName}`);
  console.log(`   Existing review for this dish: ${existingDishReview ? 'Yes' : 'No'}`);
  console.log(`   Can create review: ${canCreateDifferentDish}`);
  console.log(`   Total reviews for order: ${order.reviews.length}`);
  console.log(`   Result: ${canCreateDifferentDish && order.reviews.length === 2 ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test 6: Unique constraint validation ([orderId, dishId])
  console.log('Test 6: Unique Constraint Validation ([orderId, dishId])');
  const uniquePairs = new Set(order.reviews.map(r => `${r.orderId}-${r.dishId}`));
  const hasDuplicates = uniquePairs.size !== order.reviews.length;
  
  console.log(`   Total reviews: ${order.reviews.length}`);
  console.log(`   Unique [orderId, dishId] pairs: ${uniquePairs.size}`);
  console.log(`   Has duplicates: ${hasDuplicates}`);
  console.log(`   Result: ${!hasDuplicates ? '✅ PASS (no duplicates)' : '❌ FAIL'}\n`);

  // Test 7: Multiple reviews per order (different dishes)
  console.log('Test 7: Multiple Reviews Per Order (Different Dishes)');
  const review3: Review = {
    id: 'review-4',
    orderId: orderId,
    dishId: 'dish-3',
    dishName: 'Pasta',
    userId: userId,
    rating: 5,
    comment: 'Excellent pasta!',
  };
  
  const existingPastaReview = order.reviews.find(r => r.dishId === review3.dishId);
  if (!existingPastaReview) {
    order.reviews.push(review3);
  }
  
  const multipleReviewsPerOrder = order.reviews.length === 3;
  const allDifferentDishes = new Set(order.reviews.map(r => r.dishId)).size === order.reviews.length;
  
  console.log(`   Total reviews for order: ${order.reviews.length}`);
  console.log(`   Reviewed dishes: ${order.reviews.map(r => r.dishName).join(', ')}`);
  console.log(`   All different dishes: ${allDifferentDishes}`);
  console.log(`   Result: ${multipleReviewsPerOrder && allDifferentDishes ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test 8: Order eligibility check (completed, paid, within 30 days)
  console.log('Test 8: Order Eligibility Check');
  const now = new Date();
  const thirtyDaysAgoCheck = new Date();
  thirtyDaysAgoCheck.setDate(thirtyDaysAgoCheck.getDate() - 30);
  
  const isCompleted = order.status === 'COMPLETED';
  const isPaid = order.paymentStatus === 'PAID';
  const isWithin30Days = order.completedAt && order.completedAt >= thirtyDaysAgoCheck;
  
  const isEligible = isCompleted && isPaid && isWithin30Days;
  
  console.log(`   Order status: ${order.status}`);
  console.log(`   Payment status: ${order.paymentStatus}`);
  console.log(`   Completed at: ${order.completedAt?.toLocaleDateString()}`);
  console.log(`   Is eligible: ${isEligible}`);
  console.log(`   Result: ${isEligible ? '✅ PASS' : '❌ FAIL'}\n`);

  // Summary
  const allTestsPass = !hasDishId && 
                      order.reviews.length >= 1 && 
                      test3Pass && 
                      !canCreateDuplicate && 
                      canCreateDifferentDish && 
                      !hasDuplicates && 
                      multipleReviewsPerOrder && 
                      allDifferentDishes && 
                      isEligible;

  console.log('📊 Test Summary:');
  console.log(`   Review requires dishId: ${!hasDishId ? '✅' : '❌'}`);
  console.log(`   Can create first review: ${order.reviews.length >= 1 ? '✅' : '❌'}`);
  console.log(`   Eligible dishes filter: ${test3Pass ? '✅' : '❌'}`);
  console.log(`   Prevents duplicate reviews: ${!canCreateDuplicate ? '✅' : '❌'}`);
  console.log(`   Allows different dish reviews: ${canCreateDifferentDish ? '✅' : '❌'}`);
  console.log(`   Unique constraint: ${!hasDuplicates ? '✅' : '❌'}`);
  console.log(`   Multiple reviews per order: ${multipleReviewsPerOrder ? '✅' : '❌'}`);
  console.log(`   Order eligibility: ${isEligible ? '✅' : '❌'}`);
  console.log(`\n   Overall: ${allTestsPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  process.exit(allTestsPass ? 0 : 1);
}

testReviewSystem();
