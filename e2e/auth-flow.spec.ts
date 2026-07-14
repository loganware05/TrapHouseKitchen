import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const chefEmail = process.env.E2E_CHEF_EMAIL ?? 'integration-e2e-chef@local.test';
const chefPassword = process.env.E2E_CHEF_PASSWORD ?? 'E2E-Chef-Pass-123';

function readPasswordResetToken(email: string): string {
  const backendRoot = path.join(process.cwd(), 'backend');
  return execFileSync('npx', ['tsx', 'scripts/e2e-read-reset-token.ts', email], {
    cwd: backendRoot,
    encoding: 'utf8',
  }).trim();
}

test.describe('Auth flow', () => {
  test('registration shows validation errors', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page.getByText(/email is required/i)).toBeVisible();

    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/invalid email address/i)).toBeVisible();
  });

  test('registration, login success, and logout', async ({ page }) => {
    const email = `e2e-auth-${Date.now()}@fixture.test`;
    const password = 'E2E-Auth-Pass-123';

    await page.goto('/register');
    await page.getByLabel(/full name/i).fill('E2E Auth User');
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL('/', { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /logout/i }).click();
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL('/', { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(chefEmail);
    await page.getByLabel(/^password$/i).fill('wrong-password-not-real');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid credentials/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('forgot password → reset password → login with new password', async ({ page }) => {
    const email = `e2e-pwreset-${Date.now()}@fixture.test`;
    const initialPass = 'E2E-Initial-123';
    const nextPass = 'E2E-NextPass-456';

    await page.goto('/register');
    await page.getByLabel(/full name/i).fill('Reset Tester');
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/^password$/i).fill(initialPass);
    await page.getByLabel(/confirm password/i).fill(initialPass);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL('/', { timeout: 20_000 });
    await page.getByRole('button', { name: /logout/i }).click();

    await page.goto('/forgot-password');
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.getByText(/check your inbox|reset instructions/i).first()).toBeVisible({
      timeout: 15_000,
    });

    const token = readPasswordResetToken(email);
    expect(token.length).toBeGreaterThan(10);

    await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
    await page.getByLabel(/^new password$/i).fill(nextPass);
    await page.getByLabel(/confirm password/i).fill(nextPass);
    await page.getByRole('button', { name: /update password/i }).click();
    await expect(page).toHaveURL('/login', { timeout: 15_000 });

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(nextPass);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/', { timeout: 20_000 });
  });

  test('guest login lands on home', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /continue as guest instead/i }).click();
    await page.getByLabel(/your name/i).fill('E2E Guest');
    await page.getByRole('button', { name: /^continue$/i }).click();
    await expect(page).toHaveURL('/', { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('unauthenticated user visiting /orders is redirected to /login', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('token'));
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('customerOnly: chef visiting /cart is redirected to /chef', async ({ page }) => {
    await page.goto('/chef/login');
    await page.getByLabel(/email/i).fill(chefEmail);
    await page.getByLabel(/^password$/i).fill(chefPassword);
    await page.getByRole('button', { name: /sign in to dashboard/i }).click();
    await page.waitForURL(/\/chef(\?|$)/, { timeout: 25_000 });

    await page.goto('/cart');
    await expect(page).toHaveURL(/\/chef(\?|$)/, { timeout: 15_000 });
  });
});
