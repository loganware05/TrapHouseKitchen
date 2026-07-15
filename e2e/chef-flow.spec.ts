import { test, expect } from '@playwright/test';

const chefEmail = process.env.E2E_CHEF_EMAIL ?? 'integration-e2e-chef@local.test';
const chefPassword = process.env.E2E_CHEF_PASSWORD ?? 'E2E-Chef-Pass-123';

test.describe('Chef operations', () => {
  test('login → update order status → approve pending review', async ({ page }) => {
    await page.goto('/chef/login');
    await page.getByLabel(/email/i).fill(chefEmail);
    await page.getByLabel(/^password$/i).fill(chefPassword);
    await page.getByRole('button', { name: /sign in to dashboard/i }).click();

    await page.waitForURL(/\/chef(\?|$)/, { timeout: 25_000 });
    await expect(page.getByRole('heading', { name: /chef dashboard/i })).toBeVisible({ timeout: 15_000 });

    // Client-side nav only — full reload would clear in-memory user before /auth/me completes (persist stores token but not user).
    // Desktop: sidebar links live in aside; mobile bottom nav comes first in DOM but is md:hidden, so avoid .first() on href alone.
    await page.locator('aside').getByRole('link', { name: /^orders$/i }).click();
    await expect(page).toHaveURL(/\/chef\/orders/);
    const startBtn = page.getByRole('button', { name: /start preparing/i }).first();
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
      await page.getByRole('button', { name: /mark ready/i }).first().click();
      await page.getByRole('button', { name: /^complete$/i }).click();
    }

    await page.locator('aside').getByRole('link', { name: /^reviews$/i }).click();
    await expect(page).toHaveURL(/\/chef\/reviews/);
    await expect(page.locator('h1').filter({ hasText: /review management/i })).toBeVisible({
      timeout: 30_000,
    });

    const approve = page.getByRole('button', { name: /^approve$/i }).first();
    if (await approve.isVisible().catch(() => false)) {
      page.once('dialog', (dialog) => dialog.accept());
      await approve.click();
      await expect(page.getByText(/discount code created|approved/i).first()).toBeVisible({
        timeout: 15_000,
      });
    }
  });
});
