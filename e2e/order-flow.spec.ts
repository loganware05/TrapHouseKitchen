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

  test('menu → AI builder → checkout sheet (pay button visible)', async ({ page }) => {
    test.skip(
      !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY,
      'Set OPENAI_API_KEY or ANTHROPIC_API_KEY for the AI builder step.'
    );

    await page.goto('/');
    const budget = page.locator('input[type="number"]').first();
    await budget.fill('12');
    await page.getByRole('button', { name: /^go$/i }).click();

    await expect(page.getByRole('heading', { name: /meal builder/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /build my meal/i }).click();
    await expect(page.getByRole('button', { name: /add all to cart/i }).first()).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole('button', { name: /add all to cart/i }).first().click();
    await expect(page.getByRole('button', { name: /pay \$/i })).toBeVisible({ timeout: 30_000 });
  });

  test('menu browse → add to cart → checkout shows Pay button', async ({ page }) => {
    await page.goto('/menu');
    const addBtn = page.getByRole('button', { name: /^add\b/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 20_000 });
    await addBtn.click();
    await expect(page.getByRole('button', { name: /pay \$/i })).toBeVisible({ timeout: 25_000 });
  });
});
