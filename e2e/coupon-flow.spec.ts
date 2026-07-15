import { test, expect } from '@playwright/test';

const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? 'integration-e2e-customer@local.test';
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? 'E2E-Customer-Pass-123';

test.describe('Checkout coupons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(customerEmail);
    await page.getByLabel(/^password$/i).fill(customerPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('valid coupon updates total; remove reverts price', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: /^add\b/i }).first().click();
    await expect(page.getByRole('button', { name: /pay \$/i })).toBeVisible({ timeout: 25_000 });
    await page.getByRole('button', { name: /pay \$/i }).click();

    await expect(page.getByRole('heading', { name: /your order/i })).toBeVisible();

    await page.getByRole('button', { name: /coupon code/i }).click();
    await page.locator('input[placeholder="CODE"]').fill('E2E10OFF');
    await page.getByRole('button', { name: /^apply$/i }).click();

    await expect(page.getByText(/coupon applied|saved/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^−\$1\.00$/)).toBeVisible();

    await page.getByRole('button', { name: /^remove$/i }).click();
    await expect(page.getByText(/coupon removed/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=−$1.00')).toHaveCount(0);
  });

  test('expired coupon shows error', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: /^add\b/i }).first().click();
    await page.getByRole('button', { name: /pay \$/i }).click();
    await page.getByRole('button', { name: /coupon code/i }).click();
    await page.locator('input[placeholder="CODE"]').fill('E2EEXPIRED');
    await page.getByRole('button', { name: /^apply$/i }).click();
    await expect(page.getByText(/expired/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('invalid coupon code shows error', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: /^add\b/i }).first().click();
    await page.getByRole('button', { name: /pay \$/i }).click();
    await page.getByRole('button', { name: /coupon code/i }).click();
    await page.locator('input[placeholder="CODE"]').fill('NOPE-NOT-REAL-999');
    await page.getByRole('button', { name: /^apply$/i }).click();
    await expect(page.getByText(/invalid coupon/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
