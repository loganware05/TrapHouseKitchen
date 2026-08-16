import { test, expect } from '@playwright/test';

const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? 'integration-e2e-customer@local.test';
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? 'E2E-Customer-Pass-123';

test.describe('AI meal builder removal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(customerEmail);
    await page.getByLabel(/^password$/i).fill(customerPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('customer home no longer exposes the meal builder entry point', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText(/build my meal under/i)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /trending tonight/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
