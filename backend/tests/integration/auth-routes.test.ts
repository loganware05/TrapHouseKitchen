import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import * as emailService from '../../src/services/emailService';

describe('Auth routes and role enforcement', () => {
  const runId = randomUUID().slice(0, 8);

  it('POST /register creates customer and returns token', async () => {
    const email = `integration-reg-${runId}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'secret12', name: 'Reg User' })
      .expect(201);
    expect(res.body.data.user.role).toBe('CUSTOMER');
    expect(res.body.data.token).toBeTruthy();
  });

  it('POST /login returns token for valid credentials', async () => {
    const email = `integration-login-${runId}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'secret12', name: 'Login User' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'secret12' })
      .expect(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it('POST /guest creates guest token', async () => {
    const res = await request(app)
      .post('/api/auth/guest')
      .send({ name: `Guest ${runId}` })
      .expect(201);
    expect(res.body.data.user.isGuest).toBe(true);
    expect(res.body.data.token).toBeTruthy();
  });

  it('GET /me requires authentication', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });

  it('GET /me returns user with valid token', async () => {
    const email = `integration-me-${runId}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'secret12', name: 'Me User' })
      .expect(201);
    const token = reg.body.data.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.user.email).toBe(email);
  });

  it('chef-only GET /orders/all returns 403 for customer token', async () => {
    const email = `integration-cust-${runId}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'secret12', name: 'Cust' })
      .expect(201);
    await request(app)
      .get('/api/orders/all')
      .set('Authorization', `Bearer ${reg.body.data.token}`)
      .expect(403);
  });

  it('chef-only GET /analytics/dashboard returns 403 for customer', async () => {
    const email = `integration-dash-${runId}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'secret12', name: 'Dash' })
      .expect(201);
    await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${reg.body.data.token}`)
      .expect(403);
  });

  it('GET /analytics/user-spend returns 403 for chef role', async () => {
    const bcrypt = await import('bcryptjs');
    const chefEmail = `integration-chef-${runId}@example.com`;
    await prisma.user.create({
      data: {
        email: chefEmail,
        name: 'Chef R',
        password: await bcrypt.default.hash('chefpass12', 10),
        role: 'CHEF',
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: chefEmail, password: 'chefpass12' })
      .expect(200);

    await request(app)
      .get('/api/analytics/user-spend')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .expect(403);
  });

  it('POST /forgot-password stores token and invokes sendPasswordResetEmail', async () => {
    const spy = vi.spyOn(emailService, 'sendPasswordResetEmail').mockResolvedValue(true);
    const email = `integration-fp-${runId}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'secret12', name: 'FP User' })
      .expect(201);

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email })
      .expect(200);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user?.passwordResetToken).toBeTruthy();
    expect(user?.passwordResetExpires).toBeInstanceOf(Date);
    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0][0];
    expect(arg.resetUrl).toContain(user!.passwordResetToken!);
    spy.mockRestore();
  });

  it('POST /reset-password updates password and clears token', async () => {
    const email = `integration-rp-${runId}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'oldpass12', name: 'RP User' })
      .expect(201);

    const rawToken = 'deadbeefdeadbeefdeadbeefdeadbeef';
    await prisma.user.update({
      where: { email },
      data: {
        passwordResetToken: rawToken,
        passwordResetExpires: new Date(Date.now() + 3600_000),
      },
    });

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'newpass12' })
      .expect(200);

    const u = await prisma.user.findUnique({ where: { email } });
    expect(u?.passwordResetToken).toBeNull();
    await request(app).post('/api/auth/login').send({ email, password: 'newpass12' }).expect(200);
  });
});
