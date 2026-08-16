import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.E2E_PORT ?? '4321';
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const SKIP_WEB_SERVER = process.env.E2E_SKIP_WEBSERVER === 'true';

const webServerCommand = `npm run start -- --port ${PORT} --host 127.0.0.1`;

export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: process.env.CI ? 60_000 : 30_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: process.env.CI ? 60_000 : 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: SKIP_WEB_SERVER
    ? undefined
    : {
        command: webServerCommand,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: process.env.CI ? 300_000 : 120_000,
      },
});
