import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  /* Global setup: starts full test stack via Docker Compose before tests */
  globalSetup: './tests/global-setup.ts',
  /* Maximum time one test can run for. */
  timeout: 30 * 1000,
  expect: {
    /* Maximum time expect() should wait for the condition to be met. */
    timeout: 5000
  },
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Run with multiple workers now that auth rate limiting is disabled in Playwright config. */
  workers: process.env.CI ? 10 : undefined,
  /* Reporter to use (HTML gives a great visual timeline). */
  reporter: 'html',
  
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Auto-capture screenshot on test failure */
    screenshot: 'only-on-failure',

    /* Standardize data-testid as the default test id attribute for getByTestId locators */
    testIdAttribute: 'data-testid',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    /* Test against mobile viewports. */
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

});
