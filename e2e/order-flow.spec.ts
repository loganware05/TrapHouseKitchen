import { test, expect } from '@playwright/test';

const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? 'integration-e2e-customer@local.test';
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? 'E2E-Customer-Pass-123';

test.describe('Customer order flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(customerEmail);
    await page.getByLabel(/^password$/i).fill(customerPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('home no longer shows the meal builder', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/build my meal under/i)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /trending tonight/i })).toBeVisible();
  });

  test('menu add stays on menu until the header cart is opened', async ({ page }) => {
    await page.goto('/menu');
    const addBtn = page.getByRole('button', { name: /^add\b/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 20_000 });
    await addBtn.click();

    await expect(page).toHaveURL(/\/menu$/);
    await expect(page.getByRole('heading', { name: /your order/i })).toHaveCount(0);

    const cartButton = page.getByRole('button', { name: /open cart, 1 item/i });
    await expect(cartButton).toBeVisible();
    await cartButton.click();

    await expect(page.getByRole('heading', { name: /your order/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue to payment/i })).toBeVisible();
  });
});
