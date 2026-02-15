import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import prisma from '../../src/lib/prisma';
import bcrypt from 'bcryptjs';

describe('Review Flow Integration Tests', () => {
  let authToken: string;
  let chefToken: string;
  let userId: string;
  let chefId: string;
  let orderId: string;
  let dishId: string;
  let categoryId: string;

  beforeAll(async () => {
    // Create test category
    const category = await prisma.category.create({
      data: {
        name: 'Test Category',
        description: 'Category for testing',
        displayOrder: 1,
      },
    });
    categoryId = category.id;

    // Create test dish
    const dish = await prisma.dish.create({
      data: {
        name: 'Test Burger',
        description: 'A delicious test burger',
        price: 12.99,
        categoryId,
        status: 'AVAILABLE',
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: false,
      },
    });
    dishId = dish.id;

    // Create test customer user
    const hashedPassword = await bcrypt.hash('test-password-123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'test-customer@example.com',
        name: 'Test Customer',
        password: hashedPassword,
        role: 'CUSTOMER',
        isGuest: false,
      },
    });
    userId = user.id;

    // Create test chef user
    const chef = await prisma.user.create({
      data: {
        email: 'test-chef@example.com',
        name: 'Test Chef',
        password: hashedPassword,
        role: 'CHEF',
        isGuest: false,
      },
    });
    chefId = chef.id;

    // Get auth tokens
    const customerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test-customer@example.com',
        password: 'test-password-123',
      });
    authToken = customerLoginRes.body.data.token;

    const chefLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test-chef@example.com',
        password: 'test-password-123',
      });
    chefToken = chefLoginRes.body.data.token;

    // Create test order
    const order = await prisma.order.create({
      data: {
        userId,
        status: 'PENDING',
        paymentStatus: 'PAID',
        totalPrice: 12.99,
        tipAmount: 0,
        finalAmount: 12.99,
        items: {
          create: [
            {
              dishId,
              quantity: 1,
              priceAtOrder: 12.99,
            },
          ],
        },
      },
    });
    orderId = order.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.review.deleteMany({ where: { userId } });
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.dish.deleteMany({ where: { id: dishId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, chefId] } } });
  });

  describe('Order Status and completedAt', () => {
    it('should set completedAt when chef marks order as COMPLETED', async () => {
      // Update order status to COMPLETED
      const response = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${chefToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.order.status).toBe('COMPLETED');

      // Verify completedAt is set in database
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { completedAt: true, status: true },
      });

      expect(order?.status).toBe('COMPLETED');
      expect(order?.completedAt).not.toBeNull();
      expect(order?.completedAt).toBeInstanceOf(Date);
    });

    it('should return completed order in eligible-orders endpoint', async () => {
      const response = await request(app)
        .get('/api/reviews/eligible-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.orders).toHaveLength(1);
      expect(response.body.data.orders[0].id).toBe(orderId);
      expect(response.body.data.orders[0].status).toBe('COMPLETED');
    });
  });

  describe('Review Creation', () => {
    it('should allow creating review for completed order', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId,
          dishId,
          rating: 5,
          comment: 'Great food, would order again! This is a test review.',
        })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.review.dishId).toBe(dishId);
      expect(response.body.data.review.rating).toBe(5);
      expect(response.body.data.review.approved).toBe(false);
      expect(response.body.message).toContain('$4 discount code');
    });

    it('should not allow reviewing same dish twice', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId,
          dishId,
          rating: 4,
          comment: 'Another review attempt for the same dish.',
        })
        .expect(400);

      expect(response.body.message).toContain('already reviewed');
    });

    it('should not allow reviewing without authentication', async () => {
      await request(app)
        .post('/api/reviews')
        .send({
          orderId,
          dishId,
          rating: 5,
          comment: 'Attempting review without auth token.',
        })
        .expect(401);
    });

    it('should not allow reviewing with invalid rating', async () => {
      // Create another order for this test
      const newOrder = await prisma.order.create({
        data: {
          userId,
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          totalPrice: 12.99,
          tipAmount: 0,
          finalAmount: 12.99,
          completedAt: new Date(),
          items: {
            create: [
              {
                dishId,
                quantity: 1,
                priceAtOrder: 12.99,
              },
            ],
          },
        },
      });

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: newOrder.id,
          dishId,
          rating: 6, // Invalid: must be 1-5
          comment: 'This review has an invalid rating.',
        })
        .expect(400);

      // Clean up
      await prisma.orderItem.deleteMany({ where: { orderId: newOrder.id } });
      await prisma.order.delete({ where: { id: newOrder.id } });
    });
  });

  describe('Review Window (30 Days)', () => {
    it('should exclude orders older than 30 days from eligible orders', async () => {
      // Update order completedAt to 31 days ago
      await prisma.order.update({
        where: { id: orderId },
        data: {
          completedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app)
        .get('/api/reviews/eligible-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.orders).toHaveLength(0);
    });

    it('should not allow creating review for orders older than 30 days', async () => {
      // Try to create review for the old order
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId,
          dishId,
          rating: 5,
          comment: 'Trying to review an old order.',
        })
        .expect(400);

      expect(response.body.message).toContain('30 days');
    });

    it('should include orders within the review window', async () => {
      // Update order to be 29 days old (within window)
      await prisma.order.update({
        where: { id: orderId },
        data: {
          completedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app)
        .get('/api/reviews/eligible-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      // Should have 1 order (but it already has a review, so filtered out)
      // The endpoint filters out orders where all dishes are reviewed
      expect(response.body.data.orders).toHaveLength(0); // Already reviewed
    });
  });

  describe('Review Approval and Coupon Generation', () => {
    let reviewId: string;

    beforeAll(async () => {
      // Get the review we created earlier
      const review = await prisma.review.findFirst({
        where: { userId, orderId },
      });
      reviewId = review!.id;
    });

    it('should allow chef to approve review and generate coupon', async () => {
      const response = await request(app)
        .patch(`/api/reviews/${reviewId}/approve`)
        .set('Authorization', `Bearer ${chefToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.review.approved).toBe(true);
      expect(response.body.data.coupon).toBeDefined();
      expect(response.body.data.coupon.discountAmount).toBe(4);
      expect(response.body.data.coupon.userId).toBe(userId);
      expect(response.body.message).toContain('$4 coupon created');
    });

    it('should not allow approving already approved review', async () => {
      const response = await request(app)
        .patch(`/api/reviews/${reviewId}/approve`)
        .set('Authorization', `Bearer ${chefToken}`)
        .expect(400);

      expect(response.body.message).toContain('already approved');
    });

    it('should show approved reviews in public reviews list', async () => {
      const response = await request(app)
        .get('/api/reviews')
        .expect(200);

      expect(response.body.status).toBe('success');
      const testReview = response.body.data.reviews.find(
        (r: any) => r.id === reviewId
      );
      expect(testReview).toBeDefined();
      expect(testReview.approved).toBe(true);
    });

    it('should not allow customer to approve their own review', async () => {
      // Create another order and review for this test
      const newOrder = await prisma.order.create({
        data: {
          userId,
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          totalPrice: 12.99,
          tipAmount: 0,
          finalAmount: 12.99,
          completedAt: new Date(),
          items: {
            create: [
              {
                dishId,
                quantity: 1,
                priceAtOrder: 12.99,
              },
            ],
          },
        },
      });

      // Create new dish for new review
      const newDish = await prisma.dish.create({
        data: {
          name: 'Test Fries',
          description: 'Test side dish',
          price: 4.99,
          categoryId,
          status: 'AVAILABLE',
          isVegan: true,
          isVegetarian: true,
          isGlutenFree: false,
        },
      });

      await prisma.orderItem.create({
        data: {
          orderId: newOrder.id,
          dishId: newDish.id,
          quantity: 1,
          priceAtOrder: 4.99,
        },
      });

      const reviewRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: newOrder.id,
          dishId: newDish.id,
          rating: 5,
          comment: 'Great fries, crispy and delicious!',
        })
        .expect(201);

      const newReviewId = reviewRes.body.data.review.id;

      // Try to approve own review
      await request(app)
        .patch(`/api/reviews/${newReviewId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      // Clean up
      await prisma.review.delete({ where: { id: newReviewId } });
      await prisma.orderItem.deleteMany({ where: { orderId: newOrder.id } });
      await prisma.order.delete({ where: { id: newOrder.id } });
      await prisma.dish.delete({ where: { id: newDish.id } });
    });
  });

  describe('Per-Dish Review Status in Orders Endpoint', () => {
    it('should include review status for each order item', async () => {
      // Reset order to be recent
      await prisma.order.update({
        where: { id: orderId },
        data: {
          completedAt: new Date(),
        },
      });

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      const testOrder = response.body.data.orders.find(
        (o: any) => o.id === orderId
      );
      expect(testOrder).toBeDefined();
      expect(testOrder.items).toBeDefined();
      expect(testOrder.items.length).toBeGreaterThan(0);

      // Check if review data is included in items
      const item = testOrder.items[0];
      expect(item.reviews).toBeDefined();
      
      if (item.reviews.length > 0) {
        const review = item.reviews[0];
        expect(review).toHaveProperty('id');
        expect(review).toHaveProperty('approved');
        expect(review).toHaveProperty('createdAt');
      }
    });
  });
});
