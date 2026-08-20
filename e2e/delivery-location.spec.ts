import { test, expect } from '@playwright/test';

const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? 'integration-e2e-customer@local.test';
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? 'E2E-Customer-Pass-123';

test.describe('Dorm delivery checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(customerEmail);
    await page.getByLabel(/^password$/i).fill(customerPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('checkout requires dorm before continuing to payment', async ({ page }) => {
    await page.goto('/menu');
    const addBtn = page.getByRole('button', { name: /^add\b/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 20_000 });
    await addBtn.click();

    await page.getByRole('button', { name: /open cart, 1 item/i }).click();
    await expect(page.getByRole('heading', { name: /your order/i })).toBeVisible();

    const continueBtn = page.getByTestId('continue-to-payment');
    await expect(continueBtn).toBeDisabled();

    await page.getByTestId('delivery-dorm-select').selectOption('Harvey Hall');
    await expect(continueBtn).toBeEnabled();
  });

  test('East dorm requires room number before continuing', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: /^add\b/i }).first().click();
    await page.getByRole('button', { name: /open cart, 1 item/i }).click();

    const continueBtn = page.getByTestId('continue-to-payment');
    await page.getByTestId('delivery-dorm-select').selectOption('East');
    await expect(continueBtn).toBeDisabled();

    await page.getByTestId('delivery-room-input').fill('204');
    await expect(continueBtn).toBeEnabled();
  });
});
