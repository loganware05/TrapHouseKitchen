import { test, expect, type Page } from '@playwright/test';

const customerEmail =
  process.env.E2E_CUSTOMER_EMAIL ?? `integration-payment-${Date.now()}@local.test`;
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? 'E2E-Customer-Pass-123';
const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001';

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
  for (let attempt = 0; attempt < 60 && !filled; attempt += 1) {
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
    if (!filled) await page.waitForTimeout(500);
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

  const postalSelectors = [
    '#Field-postalCodeInput',
    'input[name="postalCode"]',
    'input[autocomplete="postal-code"]',
  ];
  for (const frame of page.frames()) {
    for (const sel of postalSelectors) {
      const loc = frame.locator(sel).first();
      if (await loc.isVisible().catch(() => false)) {
        await loc.fill('90210');
        break;
      }
    }
  }
}

async function expectStripeDecline(page: Page) {
  const declinePattern =
    /declin|insufficient funds|payment failed|could not process|try a different card/i;

  await expect
    .poll(
      async () => {
        for (const frame of page.frames()) {
          const text = await frame.locator('body').innerText().catch(() => '');
          if (declinePattern.test(text)) return true;
        }
        return false;
      },
      { timeout: 30_000 }
    )
    .toBe(true);
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

test.describe('Payment checkout (Stripe test mode)', { tag: '@core' }, () => {
  test.beforeAll(async () => {
    if (!paymentTestsEnabled || process.env.E2E_CUSTOMER_EMAIL) return;

    const register = async () =>
      fetch(`${apiURL}/api/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          password: customerPassword,
          name: 'Payment E2E Customer',
        }),
      });

    let response = await register();
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      response = await register();
    }

    if (response.status === 409) {
      return;
    }

    if (!response.ok) {
      throw new Error(`Could not provision payment E2E customer (${response.status}).`);
    }
  });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !paymentTestsEnabled,
      'Set PLAYWRIGHT_PAYMENT_TESTS=1 and STRIPE_PUBLISHABLE_KEY or VITE_STRIPE_PUBLISHABLE_KEY.'
    );
    page.on('console', (message) => {
      if (message.type() === 'error') {
        console.error(`[browser] ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      console.error(`[browser] ${error.message}`);
    });
    await loginCustomer(page);
  });

  test('success card completes checkout and reaches order confirmation', async ({ page }) => {
    await page.goto('/menu');
    const addBtn = page.getByRole('button', { name: /^add\b/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 20_000 });
    await addBtn.click();
    await page.getByRole('button', { name: /open cart, 1 item/i }).click();

    await expect(page.getByRole('button', { name: /continue to payment/i })).toBeVisible({
      timeout: 25_000,
    });
    await page.getByRole('button', { name: /continue to payment/i }).click();

    await expect(page.getByRole('heading', { name: /your order/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/secured by stripe/i)).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('heading', { name: /payment details|card and other methods/i })).toBeVisible();

    await fillStripeCard(page, '4242424242424242');
    const fallbackSubmit = page.getByTestId('fallback-payment-submit');
    await fallbackSubmit.focus();
    await fallbackSubmit.press('Enter');

    await expect(page).toHaveURL(/\/orders\//, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: /order (confirmed|received)/i })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('declined card shows error and keeps cart', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: /^add\b/i }).first().click();
    await page.getByRole('button', { name: /open cart, 1 item/i }).click();
    await expect(page.getByRole('button', { name: /continue to payment/i })).toBeVisible({
      timeout: 25_000,
    });
    await page.getByRole('button', { name: /continue to payment/i }).click();

    await expect(page.getByText(/secured by stripe/i)).toBeVisible({ timeout: 45_000 });

    await fillStripeCard(page, '4000000000009995');
    const fallbackSubmit = page.getByTestId('fallback-payment-submit');
    await fallbackSubmit.focus();
    await fallbackSubmit.press('Enter');

    await expectStripeDecline(page);

    await expect(page.getByRole('heading', { name: /your order/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^\d+\s+items · \$/i })).toBeVisible();
  });

  test('unsupported Apple Pay clients retain a usable fallback payment form', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: /^add\b/i }).first().click();
    await page.getByRole('button', { name: /open cart, 1 item/i }).click();
    await page.getByRole('button', { name: /continue to payment/i }).click();

    await expect(page.getByRole('heading', { name: /payment details|card and other methods/i })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByTestId('fallback-payment-submit')).toBeEnabled();
    await expect(page.getByText(/secured by stripe/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /apple pay/i })).toHaveCount(0);
    await page.getByTestId('fallback-payment-submit').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'test-results/payment-flow-checkout-fallback.png',
      fullPage: false,
    });
  });
});
