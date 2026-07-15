import { test, expect, type Page } from '@playwright/test';

const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? 'integration-e2e-customer@local.test';
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? 'E2E-Customer-Pass-123';

const paymentTestsEnabled =
  process.env.PLAYWRIGHT_PAYMENT_TESTS === '1' &&
  !!(process.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY);

/**
 * Stripe Payment Element uses nested iframes; fill the card fields best-effort for test mode.
 */
async function fillStripeCard(page: Page, cardNumber: string) {
  const numberSelectors = [
    'input[name="cardnumber"]',
    'input[name="cardNumber"]',
    '#Field-numberInput',
    'input[autocomplete="cc-number"]',
    'input[placeholder*="Card"]',
    'input[data-elements-stable-field-name="cardNumber"]',
  ];

  let filled = false;
  for (const frame of page.frames()) {
    if (filled) break;
    try {
      for (const sel of numberSelectors) {
        const loc = frame.locator(sel).first();
        if (await loc.isVisible().catch(() => false)) {
          await loc.fill(cardNumber);
          filled = true;
          break;
        }
      }
    } catch {
      /* try next frame */
    }
  }
  if (!filled) {
    throw new Error('Could not find Stripe card number field in any frame.');
  }

  const expSelectors = ['#Field-expiryInput', 'input[name="exp-date"]', 'input[autocomplete="cc-exp"]'];
  for (const frame of page.frames()) {
    for (const sel of expSelectors) {
      const loc = frame.locator(sel).first();
      if (await loc.isVisible().catch(() => false)) {
        await loc.fill('1234');
        break;
      }
    }
  }

  const cvcSelectors = ['#Field-cvcInput', 'input[name="cvc"]', 'input[autocomplete="cc-csc"]'];
  for (const frame of page.frames()) {
    for (const sel of cvcSelectors) {
      const loc = frame.locator(sel).first();
      if (await loc.isVisible().catch(() => false)) {
        await loc.fill('123');
        break;
      }
    }
  }
}

async function loginCustomer(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(customerEmail);
  await page.getByLabel(/^password$/i).fill(customerPassword);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('Payment checkout (Stripe test mode)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !paymentTestsEnabled,
      'Set PLAYWRIGHT_PAYMENT_TESTS=1 and STRIPE_PUBLISHABLE_KEY or VITE_STRIPE_PUBLISHABLE_KEY.'
    );
    await loginCustomer(page);
  });

  test('success card completes checkout and reaches order confirmation', async ({ page }) => {
    await page.goto('/menu');
    const addBtn = page.getByRole('button', { name: /^add\b/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 20_000 });
    await addBtn.click();

    await expect(page.getByRole('button', { name: /pay \$/i })).toBeVisible({ timeout: 25_000 });
    await page.getByRole('button', { name: /pay \$/i }).click();

    await expect(page.getByRole('heading', { name: /your order/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/secured by stripe/i)).toBeVisible({ timeout: 45_000 });

    await fillStripeCard(page, '4242424242424242');
    await page.getByRole('button', { name: /pay \$[\d.]+/i }).click();

    await expect(page).toHaveURL(/\/orders\//, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: /order (confirmed|received)/i })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('declined card shows error and keeps cart', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: /^add\b/i }).first().click();
    await expect(page.getByRole('button', { name: /pay \$/i })).toBeVisible({ timeout: 25_000 });
    await page.getByRole('button', { name: /pay \$/i }).click();

    await expect(page.getByText(/secured by stripe/i)).toBeVisible({ timeout: 45_000 });

    await fillStripeCard(page, '4000000000009995');
    await page.getByRole('button', { name: /pay \$[\d.]+/i }).click();

    await expect(
      page.getByText(/declin|payment failed|could not process|card was declined/i).first()
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.getByRole('heading', { name: /your order/i })).toBeVisible();
    await expect(page.getByText(/\d+\s+items/i).or(page.getByRole('button', { name: /items · \$/i }))).toBeVisible();
  });
});
