import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ]
    : 'list',
  timeout: 120_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile\.spec\.ts$/,
    },
    {
      name: 'iPhone 13',
      use: { ...devices['iPhone 13'] },
      testMatch: /mobile\.spec\.ts$/,
    },
  ],
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1'
      ? undefined
      : [
          {
            command: 'cd backend && npm run dev',
            url: `${apiURL}/health`,
            reuseExistingServer: true,
            timeout: 120_000,
            stdout: 'pipe',
            stderr: 'pipe',
          },
          {
            command: 'cd frontend && npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
            url: baseURL,
            reuseExistingServer: true,
            timeout: 120_000,
            stdout: 'pipe',
            stderr: 'pipe',
            env: {
              ...process.env,
              VITE_API_URL: `${apiURL}/api`,
              VITE_STRIPE_PUBLISHABLE_KEY:
                process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
                process.env.STRIPE_PUBLISHABLE_KEY ||
                '',
            },
          },
        ],
});
