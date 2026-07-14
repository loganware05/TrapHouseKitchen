import { test, expect } from '@playwright/test';

const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? 'integration-e2e-customer@local.test';
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? 'E2E-Customer-Pass-123';
const chefEmail = process.env.E2E_CHEF_EMAIL ?? 'integration-e2e-chef@local.test';
const chefPassword = process.env.E2E_CHEF_PASSWORD ?? 'E2E-Chef-Pass-123';

test.describe('Mobile (iPhone 13)', () => {
  test('customer login, menu, checkout sheet, pay control reachable', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(customerEmail);
    await page.getByLabel(/^password$/i).fill(customerPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible({
      timeout: 25_000,
    });

    await page.getByRole('link', { name: /^menu$/i }).click();
    await expect(page).toHaveURL(/\/menu/, { timeout: 15_000 });
    const addBtn = page.getByRole('button', { name: /^add\b/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 20_000 });
    await addBtn.click();

    const fab = page.getByRole('button', { name: /open cart/i });
    await expect(fab).toBeVisible({ timeout: 20_000 });
    await fab.click();

    await expect(page.getByRole('heading', { name: /your order/i })).toBeVisible({ timeout: 15_000 });
    const sheet = page.locator('.fixed.inset-0.z-\\[100\\]');
    await expect(sheet).toBeVisible();
    await sheet.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(page.getByRole('button', { name: /pay \$/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('chef login and bottom navigation', async ({ page }) => {
    await page.goto('/chef/login');
    await page.getByLabel(/email/i).fill(chefEmail);
    await page.getByLabel(/^password$/i).fill(chefPassword);
    await page.getByRole('button', { name: /sign in to dashboard/i }).click();
    await page.waitForURL(/\/chef(\?|$)/, { timeout: 25_000 });
    await expect(page.getByRole('heading', { name: /chef dashboard/i })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('link', { name: /^orders$/i }).click();
    await expect(page).toHaveURL(/\/chef\/orders/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /order management/i })).toBeVisible({ timeout: 20_000 });
  });
});
