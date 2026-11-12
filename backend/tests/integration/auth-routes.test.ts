import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import * as emailService from '../../src/services/emailService';
import { hashPasswordResetToken } from '../../src/lib/passwordResetToken';

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

  it('POST /forgot-password stores hashed token and invokes sendPasswordResetEmail', async () => {
    const spy = vi.spyOn(emailService, 'sendPasswordResetEmail').mockResolvedValue(true);
    const email = `integration-fp-${runId}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'secret12', name: 'FP User' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email })
      .expect(200);

    expect(res.body.data?.resetUrl).toBeUndefined();

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user?.passwordResetToken).toBeTruthy();
    expect(user?.passwordResetExpires).toBeInstanceOf(Date);
    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0][0];
    expect(arg.resetUrl).toContain(encodeURIComponent(arg.resetToken));
    expect(user!.passwordResetToken).toBe(hashPasswordResetToken(arg.resetToken));
    expect(user!.passwordResetToken).not.toBe(arg.resetToken);
    spy.mockRestore();
  });

  it('POST /forgot-password includes resetUrl when SHOW_PASSWORD_RESET_LINK=1 (non-prod)', async () => {
    const prev = process.env.SHOW_PASSWORD_RESET_LINK;
    process.env.SHOW_PASSWORD_RESET_LINK = '1';
    const spy = vi.spyOn(emailService, 'sendPasswordResetEmail').mockResolvedValue(true);
    const email = `integration-fp-link-${runId}@example.com`;

    try {
      await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'secret12', name: 'FP Link' })
        .expect(201);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      expect(res.body.data?.resetUrl).toMatch(/\/reset-password\?token=/);
      expect(res.body.data?.resetToken).toBeTruthy();
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user!.passwordResetToken).toBe(hashPasswordResetToken(res.body.data.resetToken));
    } finally {
      if (prev === undefined) {
        delete process.env.SHOW_PASSWORD_RESET_LINK;
      } else {
        process.env.SHOW_PASSWORD_RESET_LINK = prev;
      }
      spy.mockRestore();
    }
  });

  it('POST /forgot-password includes resetUrl when APP_ENV=staging even if NODE_ENV=production', async () => {
    const prevLink = process.env.SHOW_PASSWORD_RESET_LINK;
    const prevAppEnv = process.env.APP_ENV;
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.SHOW_PASSWORD_RESET_LINK = '1';
    process.env.APP_ENV = 'staging';
    process.env.NODE_ENV = 'production';
    const spy = vi.spyOn(emailService, 'sendPasswordResetEmail').mockResolvedValue(true);
    const email = `integration-fp-staging-${runId}@example.com`;

    try {
      await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'secret12', name: 'FP Staging' })
        .expect(201);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      expect(res.body.data?.resetUrl).toMatch(/\/reset-password\?token=/);
      expect(res.body.data?.resetToken).toBeTruthy();
    } finally {
      if (prevLink === undefined) delete process.env.SHOW_PASSWORD_RESET_LINK;
      else process.env.SHOW_PASSWORD_RESET_LINK = prevLink;
      if (prevAppEnv === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = prevAppEnv;
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNodeEnv;
      spy.mockRestore();
    }
  });

  it('POST /forgot-password omits resetUrl in production when APP_ENV is not staging', async () => {
    const prevLink = process.env.SHOW_PASSWORD_RESET_LINK;
    const prevAppEnv = process.env.APP_ENV;
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.SHOW_PASSWORD_RESET_LINK = '1';
    delete process.env.APP_ENV;
    process.env.NODE_ENV = 'production';
    const spy = vi.spyOn(emailService, 'sendPasswordResetEmail').mockResolvedValue(true);
    const email = `integration-fp-prod-${runId}@example.com`;

    try {
      await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'secret12', name: 'FP Prod' })
        .expect(201);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      expect(res.body.data?.resetUrl).toBeUndefined();
      expect(res.body.data?.resetToken).toBeUndefined();
    } finally {
      if (prevLink === undefined) delete process.env.SHOW_PASSWORD_RESET_LINK;
      else process.env.SHOW_PASSWORD_RESET_LINK = prevLink;
      if (prevAppEnv === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = prevAppEnv;
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNodeEnv;
      spy.mockRestore();
    }
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
        passwordResetToken: hashPasswordResetToken(rawToken),
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
