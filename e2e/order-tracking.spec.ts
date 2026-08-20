import { test, expect, type APIRequestContext } from '@playwright/test';

const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';
const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? 'integration-e2e-customer@local.test';
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? 'E2E-Customer-Pass-123';
const chefEmail = process.env.E2E_CHEF_EMAIL ?? 'integration-e2e-chef@local.test';
const chefPassword = process.env.E2E_CHEF_PASSWORD ?? 'E2E-Chef-Pass-123';

async function loginToken(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${apiURL}/api/auth/login`, {
    data: { email, password },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = await res.json();
  return body.data.token as string;
}

async function trackingOrderId(request: APIRequestContext, token: string): Promise<string> {
  const res = await request.get(`${apiURL}/api/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const orders = body.data.orders as { id: string; specialInstructions: string | null }[];
  const o = orders.find((x) => x.specialInstructions === 'E2E_ORDER_TRACKING');
  expect(o, 'Run npm run e2e:seed so E2E_ORDER_TRACKING exists').toBeTruthy();
  return o!.id;
}

async function loginCustomerUi(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(customerEmail);
  await page.getByLabel(/^password$/i).fill(customerPassword);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('Order tracking', () => {
  test('list, detail status, chef update visible after reload', async ({ browser, request }) => {
    const token = await loginToken(request, customerEmail, customerPassword);
    const orderId = await trackingOrderId(request, token);

    const chefContext = await browser.newContext();
    const chefPage = await chefContext.newPage();
    await chefPage.goto('/chef/login');
    await chefPage.getByLabel(/email/i).fill(chefEmail);
    await chefPage.getByLabel(/^password$/i).fill(chefPassword);
    await chefPage.getByRole('button', { name: /sign in to dashboard/i }).click();
    await chefPage.waitForURL(/\/chef(\?|$)/, { timeout: 25_000 });

    await chefPage.goto('/chef/orders');
    const trackingCard = chefPage.locator('div.rounded-lg').filter({ hasText: 'E2E_ORDER_TRACKING' }).first();
    await expect(trackingCard).toBeVisible({ timeout: 30_000 });
    const startPreparing = trackingCard.getByRole('button', { name: /start preparing/i });
    if (await startPreparing.isVisible().catch(() => false)) {
      await startPreparing.click();
    }
    await expect(trackingCard.getByText('PREPARING')).toBeVisible({ timeout: 15_000 });

    await chefContext.close();

    const customerPage = await browser.newPage();
    await loginCustomerUi(customerPage);
    await customerPage.goto('/orders');
    await expect(customerPage.getByRole('heading', { name: /my orders/i })).toBeVisible({ timeout: 20_000 });
    await expect(customerPage.getByText('Preparing').first()).toBeVisible({ timeout: 15_000 });

    await customerPage.goto(`/orders/${orderId}`);
    await expect(customerPage.getByRole('list', { name: /order progress/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(customerPage.getByText('Preparing').first()).toBeVisible();
    await expect(customerPage.getByText('Out for delivery').first()).toBeVisible();

    await customerPage.close();
  });
});
