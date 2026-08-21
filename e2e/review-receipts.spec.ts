import { test, expect } from '@playwright/test';

const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? 'integration-e2e-customer@local.test';
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? 'E2E-Customer-Pass-123';

test.describe('Receipt-style dish reviews', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(customerEmail);
    await page.getByLabel(/^password$/i).fill(customerPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/(\?|$)/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible();
  });

  test('orders receipt → leave review with dish preselected → pending status', async ({ page }) => {
    await page.getByRole('link', { name: /^orders$/i }).first().click();
    await expect(page).toHaveURL(/\/orders/);
    await expect(page.getByRole('heading', { name: /my orders/i })).toBeVisible({ timeout: 20_000 });

    const receipt = page.getByRole('article', { name: /receipt for order/i }).filter({
      has: page.getByText(/east hall 214/i),
    });
    await expect(receipt).toBeVisible({ timeout: 20_000 });
    await expect(receipt.getByRole('button', { name: /leave a review/i })).toBeVisible();

    await receipt.getByRole('button', { name: /leave a review/i }).click();
    await expect(page).toHaveURL(/\/reviews\/new\?.*orderId=.*dishId=/);
    await expect(page.getByRole('heading', { name: /write a review/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/reviewing:/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/e2e seed burger/i).first()).toBeVisible();

    await page.getByRole('button', { name: /^5 stars$/i }).click();
    await page.getByLabel(/your review/i).fill(
      'E2E receipt review — tasty burger from the seeded order receipt.'
    );
    await page.getByRole('button', { name: /submit review/i }).click();
    await expect(page.getByText(/review submitted/i).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole('link', { name: /^orders$/i }).first().click();
    await expect(page).toHaveURL(/\/orders/);
    const updated = page.getByRole('article', { name: /receipt for order/i }).filter({
      has: page.getByText(/east hall 214/i),
    });
    await expect(updated.getByText(/review pending/i)).toBeVisible({ timeout: 20_000 });
    await expect(updated.getByRole('button', { name: /leave a review/i })).toHaveCount(0);

    await page.screenshot({
      path: '.agent/evidence/review-receipts-20260821/orders-receipt-pending.png',
    });
  });

  test('profile shows recent receipts', async ({ page }) => {
    await page.getByRole('link', { name: /^profile$/i }).first().click();
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole('heading', { name: /my profile/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /recent receipts/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.screenshot({
      path: '.agent/evidence/review-receipts-20260821/profile-recent-receipts.png',
    });
  });
});
