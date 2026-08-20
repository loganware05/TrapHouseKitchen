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

async function trackingOrder(
  request: APIRequestContext,
  token: string
): Promise<{ id: string; orderNumber: number }> {
  const res = await request.get(`${apiURL}/api/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const orders = body.data.orders as {
    id: string;
    orderNumber: number;
    specialInstructions: string | null;
  }[];
  const o = orders.find((x) => x.specialInstructions === 'E2E_ORDER_TRACKING');
  expect(o, 'Run npm run e2e:seed so E2E_ORDER_TRACKING exists').toBeTruthy();
  return { id: o!.id, orderNumber: o!.orderNumber };
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
  test('chef status change appears on open confirmation without reload', async ({
    browser,
    request,
  }) => {
    const token = await loginToken(request, customerEmail, customerPassword);
    const order = await trackingOrder(request, token);

    const customerPage = await browser.newPage();
    await loginCustomerUi(customerPage);

    // SPA navigation keeps auth user in memory (page.goto remounts and races token persist)
    await customerPage.getByRole('link', { name: /^orders$/i }).first().click();
    await expect(customerPage.getByRole('heading', { name: /my orders/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(customerPage.getByText(`Order #${order.orderNumber}`).first()).toBeVisible({
      timeout: 20_000,
    });
    await customerPage.getByText(`Order #${order.orderNumber}`).first().click();
    await expect(customerPage).toHaveURL(new RegExp(`/orders/${order.id}`));
    await expect(customerPage.getByRole('list', { name: /order progress/i })).toBeVisible({
      timeout: 20_000,
    });
    const progress = customerPage.getByRole('list', { name: /order progress/i });
    await expect(
      progress.getByRole('listitem').filter({ has: customerPage.locator('[aria-current="step"]') })
    ).toContainText('Placed');

    // Keep customer tab "active" for polling while Chef acts in another context
    await customerPage.bringToFront();

    const chefContext = await browser.newContext();
    const chefPage = await chefContext.newPage();
    await chefPage.goto('/chef/login');
    await chefPage.getByLabel(/email/i).fill(chefEmail);
    await chefPage.getByLabel(/^password$/i).fill(chefPassword);
    await chefPage.getByRole('button', { name: /sign in to dashboard/i }).click();
    await chefPage.waitForURL(/\/chef(\?|$)/, { timeout: 25_000 });

    await chefPage.locator('aside').getByRole('link', { name: /^orders$/i }).click();
    await expect(chefPage.getByRole('heading', { name: /order management/i })).toBeVisible({
      timeout: 20_000,
    });
    const trackingCard = chefPage
      .locator('div.rounded-lg')
      .filter({ hasText: `Order #${order.orderNumber}` })
      .first();
    await expect(trackingCard).toBeVisible({ timeout: 30_000 });
    const startPreparing = trackingCard.getByRole('button', { name: /start preparing/i });
    await expect(startPreparing).toBeVisible({ timeout: 15_000 });
    await startPreparing.click();
    await expect(trackingCard.getByText('PREPARING')).toBeVisible({ timeout: 15_000 });

    await customerPage.bringToFront();
    // Poll (~15s, including when tab is backgrounded) should move aria-current to Preparing
    await expect
      .poll(
        async () =>
          progress
            .getByRole('listitem')
            .filter({ has: customerPage.locator('[aria-current="step"]') })
            .textContent(),
        { timeout: 25_000 }
      )
      .toMatch(/Preparing/i);

    await chefContext.close();
    await customerPage.close();
  });
});
