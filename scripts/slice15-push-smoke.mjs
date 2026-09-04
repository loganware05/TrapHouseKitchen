import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const EVIDENCE = '/workspace/.agent/evidence/slice-15-pwa-web-push-20260904';
const shots = path.join(EVIDENCE, 'screenshots');
fs.mkdirSync(shots, { recursive: true });
const notes = [];
const log = (msg) => { console.log(msg); notes.push(msg); };

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-dev-shm-usage'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

// Establish origin first, then grant (Playwright docs pattern)
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
await context.grantPermissions(['notifications'], { origin: 'http://localhost:5173' });
log(`Notification.permission after grantPermissions: ${await page.evaluate(() => Notification.permission)}`);

await page.screenshot({ path: path.join(shots, '01-login.png'), fullPage: true });
await page.fill('#email', 'customer@traphouse.com');
await page.fill('#password', 'customer123');
await page.click('button[type="submit"]');
await page.waitForTimeout(1500);
log(`After login URL: ${page.url()}`);

// Client-side nav so auth store user stays in memory
const profileLink = page.locator('a[href="/profile"]');
if (await profileLink.count()) {
  await profileLink.first().click();
} else {
  await page.evaluate(() => history.pushState({}, '', '/profile'));
  await page.goto('http://localhost:5173/profile');
}
await page.waitForURL('**/profile', { timeout: 10000 });
await page.waitForTimeout(1000);

const toggle = page.getByRole('switch', { name: /order push notifications/i });
await toggle.waitFor({ state: 'visible', timeout: 10000 });
log(`Toggle visible. aria-checked: ${await toggle.getAttribute('aria-checked')}`);
log(`Disabled?: ${await toggle.isDisabled()}`);
log(`Permission now: ${await page.evaluate(() => Notification.permission)}`);
log(`Heading present: ${(await page.getByRole('heading', { name: 'Order notifications' }).count()) > 0}`);
await page.screenshot({ path: path.join(shots, '02-profile-before-toggle.png'), fullPage: true });

// If still denied in headless, stub permission + PushManager for subscribe path evidence
if ((await page.evaluate(() => Notification.permission)) !== 'granted') {
  log('Headless permission still not granted — injecting test stubs for subscribe path');
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'granted' });
    Notification.requestPermission = async () => 'granted';
  });
  // Re-navigate client-side after stubbing is hard with addInitScript mid-session;
  // instead override on window for this document:
  await page.evaluate(() => {
    Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'granted' });
    Notification.requestPermission = async () => 'granted';

    // Minimal PushManager stub if SW subscribe unavailable
    const fakeSub = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/playwright-smoke',
      toJSON() {
        return {
          endpoint: this.endpoint,
          keys: { p256dh: 'smoke-p256dh', auth: 'smoke-auth' },
        };
      },
      unsubscribe: async () => true,
    };
    const fakeReg = {
      pushManager: {
        getSubscription: async () => null,
        subscribe: async () => fakeSub,
      },
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve(fakeReg),
        getRegistration: async () => fakeReg,
      },
    });
  });
  // Force toggle enabled state by re-checking — component already mounted with denied.
  // Reload profile with stubs via init script on next navigation:
}

// Fresh context with stubs from the start for the enable path
await browser.close();

const browser2 = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
const context2 = await browser2.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await context2.addInitScript(() => {
  Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'default' });
  let perm = 'default';
  Object.defineProperty(Notification, 'permission', {
    configurable: true,
    get: () => perm,
  });
  Notification.requestPermission = async () => {
    perm = 'granted';
    return 'granted';
  };

  const fakeSub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/playwright-smoke',
    toJSON() {
      return {
        endpoint: this.endpoint,
        keys: { p256dh: 'smoke-p256dh', auth: 'smoke-auth' },
      };
    },
    unsubscribe: async () => true,
  };
  const fakeReg = {
    pushManager: {
      getSubscription: async () => null,
      subscribe: async () => fakeSub,
    },
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      ready: Promise.resolve(fakeReg),
      addEventListener() {},
      register: async () => fakeReg,
      getRegistration: async () => fakeReg,
    },
  });
});

const page2 = await context2.newPage();
page2.on('dialog', async (d) => {
  log(`UNEXPECTED auto dialog: ${d.type()} ${d.message()}`);
  await d.dismiss();
});

await page2.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
log(`Init permission (expect default, not prompted yet): ${await page2.evaluate(() => Notification.permission)}`);
await page2.fill('#email', 'customer@traphouse.com');
await page2.fill('#password', 'customer123');
await page2.click('button[type="submit"]');
await page2.waitForTimeout(1500);

await page2.locator('a[href="/profile"]').first().click();
await page2.waitForURL('**/profile');
await page2.waitForTimeout(1200);

const toggle2 = page2.getByRole('switch', { name: /order push notifications/i });
await toggle2.waitFor({ state: 'visible' });
log(`Before enable aria-checked=${await toggle2.getAttribute('aria-checked')} disabled=${await toggle2.isDisabled()}`);
await page2.screenshot({ path: path.join(shots, '02b-profile-ready-to-enable.png'), fullPage: true });

await toggle2.click();
await page2.waitForTimeout(2500);
log(`After enable aria-checked=${await toggle2.getAttribute('aria-checked')}`);
log(`Permission after toggle click: ${await page2.evaluate(() => Notification.permission)}`);
await page2.screenshot({ path: path.join(shots, '03-profile-after-toggle.png'), fullPage: true });

const token = await page2.evaluate(() => localStorage.getItem('token'));
const subRes = await page2.request.get('http://localhost:3001/api/push/subscriptions', {
  headers: { Authorization: `Bearer ${token}` },
});
const subJson = await subRes.json();
log(`Backend subscriptions: status=${subRes.status()} enabled=${subJson?.data?.enabled} count=${subJson?.data?.subscriptions?.length} endpoint=${subJson?.data?.subscriptions?.[0]?.endpoint}`);

await page2.locator('a[href="/orders"]').first().click();
await page2.waitForTimeout(800);
const ordersToggleCount = await page2.getByRole('switch', { name: /order push notifications/i }).count();
log(`Orders page push toggle count (expect 0): ${ordersToggleCount}`);
await page2.screenshot({ path: path.join(shots, '04-orders-no-toggle.png'), fullPage: true });

await page2.locator('a[href="/profile"]').first().click();
await page2.waitForTimeout(800);
const toggle3 = page2.getByRole('switch', { name: /order push notifications/i });
await toggle3.focus();
log(`Focused aria-label: ${await page2.evaluate(() => document.activeElement?.getAttribute('aria-label'))}`);
log(`aria-describedby present: ${await toggle3.getAttribute('aria-describedby')}`);
await page2.screenshot({ path: path.join(shots, '05-profile-toggle-focused.png'), fullPage: true });

fs.writeFileSync(path.join(EVIDENCE, 'browser-smoke-notes.txt'), notes.join('\n') + '\n');
await browser2.close();
log('SMOKE_DONE');
