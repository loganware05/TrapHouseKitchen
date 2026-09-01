import { test, expect } from '@playwright/test';

const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? 'integration-e2e-customer@local.test';
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? 'E2E-Customer-Pass-123';
const chefEmail = process.env.E2E_CHEF_EMAIL ?? 'integration-e2e-chef@local.test';
const chefPassword = process.env.E2E_CHEF_PASSWORD ?? 'E2E-Chef-Pass-123';

test.describe('Mobile (iPhone 13)', () => {
  test('customer header cart opens checkout without blocking menu adds', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(customerEmail);
    await page.getByLabel(/^password$/i).fill(customerPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible({
      timeout: 25_000,
    });

    await page.getByRole('link', { name: /^see all$/i }).first().click();
    await expect(page).toHaveURL(/\/menu/, { timeout: 15_000 });
    const addBtn = page.getByRole('button', { name: /^add\b/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 20_000 });
    await addBtn.click();

    await expect(page.getByText(/added to cart/i)).toBeVisible();
    await expect(page).toHaveURL(/\/menu$/);
    await expect(page.getByRole('heading', { name: /your order/i })).toHaveCount(0);

    const headerCart = page.getByRole('button', { name: /open cart, 1 item/i });
    await expect(headerCart).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/added to cart/i)).toBeHidden({ timeout: 10_000 });
    await page.screenshot({
      path: '.agent/evidence/cart-ux-polish-20260815/mobile-header-cart.png',
    });
    await headerCart.click();

    await expect(page.getByRole('heading', { name: /your order/i })).toBeVisible({ timeout: 15_000 });
    const sheet = page.locator('.fixed.inset-0.z-\\[100\\]');
    await expect(sheet).toBeVisible();
    await expect(page.getByRole('button', { name: /continue to payment/i })).toBeVisible({
      timeout: 10_000,
    });
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

    const bottomNav = page.locator('nav.fixed.bottom-0');
    await expect(bottomNav.getByRole('link', { name: /^dashboard$/i })).not.toHaveClass(/text-primary-600/);
    await expect(bottomNav.getByRole('link', { name: /^orders$/i })).toHaveClass(/text-primary-600/);
  });

  test('pull-to-refresh on orders refetches list', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(customerEmail);
    await page.getByLabel(/^password$/i).fill(customerPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible({
      timeout: 25_000,
    });

    await page.getByRole('link', { name: /^orders$/i }).first().click();
    await expect(page.getByRole('heading', { name: /my orders/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('pull-to-refresh')).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 0));

    const ordersRequest = page.waitForResponse(
      (res) => res.url().includes('/api/orders') && res.request().method() === 'GET',
      { timeout: 15_000 }
    );

    // Synthetic touch drag (iPhone project). Falls back to logic selftest if this is flaky in CI.
    const gestureOk = await page.evaluate(() => {
      const target = document.querySelector('[data-testid="pull-to-refresh"]') || document.body;
      if (typeof TouchEvent === 'undefined' || typeof Touch === 'undefined') {
        return false;
      }
      const startY = 80;
      const endY = 280;
      const fire = (type: string, y: number, cancelable: boolean) => {
        const touch = new Touch({
          identifier: 1,
          target: target as EventTarget,
          clientX: 200,
          clientY: y,
          pageX: 200,
          pageY: y,
        });
        target.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable,
            touches: type === 'touchend' ? [] : [touch],
            changedTouches: [touch],
          })
        );
      };
      fire('touchstart', startY, false);
      fire('touchmove', startY + 40, true);
      fire('touchmove', startY + 120, true);
      fire('touchmove', endY, true);
      fire('touchend', endY, false);
      return true;
    });

    test.skip(!gestureOk, 'TouchEvent/Touch constructors unavailable — logic selftest is the gate');
    await ordersRequest;
  });
});
