import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  /* Global setup: starts Docker containers (Postgres + Redis) before tests */
  globalSetup: process.env.CI ? undefined : './tests/global-setup.ts',
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
  workers: process.env.CI ? 4 : 3,
  /* Reporter to use (HTML gives a great visual timeline). */
  reporter: 'html',
  
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

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

  /* Run your local backend and auto-reloading Vite server before starting the tests in test mode */
  webServer: [
    {
      // Піднімаємо .NET Бекенд
      // cd fixes ContentRootPath so appsettings.json / wwwroot are resolved correctly;
      // mkdir -p ensures PhysicalFileProvider doesn't throw on missing uploads dir;
      // IS_PLAYWRIGHT_TESTS=false in CI prevents appsettings.Playwright.json from
      // overriding env-var connection strings with local-dev values.
      command: process.env.CI
        ? 'cd ../Backend/src/ProzoroBanka.API && dotnet run --no-build --configuration Release'
        : 'dotnet run --project ../Backend/src/ProzoroBanka.API/ProzoroBanka.API.csproj',
      port: 5188,
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        IS_PLAYWRIGHT_TESTS: process.env.CI ? 'false' : 'true',
      }
    },
    {
      // Піднімаємо Vite Фронтенд
      command: 'npm run dev -- --mode test',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' // Тестовий ключ для фронта
      }
    }
  ],
});
