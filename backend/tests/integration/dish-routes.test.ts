import { describe, it, expect, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';

describe('Dish routes', () => {
  let categoryId: string;
  let dishId: string;
  let chefToken: string;
  let customerToken: string;

  beforeEach(async () => {
    const suffix = randomUUID().slice(0, 8);
    const category = await prisma.category.create({
      data: {
        name: `Integration DishRoute Cat ${suffix}`,
        description: 'cat',
        displayOrder: 1,
      },
    });
    categoryId = category.id;

    const dish = await prisma.dish.create({
      data: {
        name: `Integration DishRoute Item ${suffix}`,
        description: 'tasty',
        price: 11.5,
        categoryId,
        status: 'AVAILABLE',
        isVegan: false,
        isVegetarian: true,
        isGlutenFree: false,
      },
    });
    dishId = dish.id;

    const hashed = await bcrypt.hash('chefPass123', 10);
    const chefEmail = `integration-chef-dish-${suffix}@example.com`;
    await prisma.user.create({
      data: {
        email: chefEmail,
        name: 'Dish Chef',
        password: hashed,
        role: 'CHEF',
      },
    });
    const chefLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: chefEmail, password: 'chefPass123' })
      .expect(200);
    chefToken = chefLogin.body.data.token;

    const custEmail = `integration-cust-dish-${suffix}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: custEmail, password: 'custPass12', name: 'Dish Customer' })
      .expect(201);
    customerToken = reg.body.data.token;
  });

  it('GET /api/dishes returns dishes for anonymous clients', async () => {
    const res = await request(app).get('/api/dishes').expect(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data.dishes)).toBe(true);
    expect(res.body.data.dishes.some((d: { id: string }) => d.id === dishId)).toBe(true);
  });

  it('GET /api/dishes/:id returns 200 with allergens and ingredients shape', async () => {
    const res = await request(app).get(`/api/dishes/${dishId}`).expect(200);
    expect(res.body.data.dish.id).toBe(dishId);
    expect(res.body.data.dish.allergens).toBeDefined();
    expect(res.body.data.dish.ingredients).toBeDefined();
  });

  it('GET /api/dishes/:id returns 404 for unknown id', async () => {
    const fakeId = randomUUID();
    await request(app).get(`/api/dishes/${fakeId}`).expect(404);
  });

  it('POST /api/dishes returns 403 for customer', async () => {
    await request(app)
      .post('/api/dishes')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Evil Dish',
        description: 'nope',
        price: 9,
        categoryId,
      })
      .expect(403);
  });

  it('POST /api/dishes creates dish for chef', async () => {
    const res = await request(app)
      .post('/api/dishes')
      .set('Authorization', `Bearer ${chefToken}`)
      .send({
        name: `New Chef Dish ${randomUUID().slice(0, 6)}`,
        description: 'from test',
        price: 8.25,
        categoryId,
      })
      .expect(201);
    expect(res.body.data.dish.categoryId).toBe(categoryId);
    expect(res.body.data.dish.status).toBe('AVAILABLE');
  });

  it('PUT /api/dishes/:id updates status (e.g. to UNAVAILABLE)', async () => {
    const res = await request(app)
      .put(`/api/dishes/${dishId}`)
      .set('Authorization', `Bearer ${chefToken}`)
      .send({ status: 'UNAVAILABLE' })
      .expect(200);
    expect(res.body.data.dish.status).toBe('UNAVAILABLE');
  });

  it('DELETE /api/dishes/:id soft-deletes by setting UNAVAILABLE', async () => {
    const res = await request(app)
      .delete(`/api/dishes/${dishId}`)
      .set('Authorization', `Bearer ${chefToken}`)
      .expect(200);
    expect(res.body.data.dish.status).toBe('UNAVAILABLE');
  });
});
