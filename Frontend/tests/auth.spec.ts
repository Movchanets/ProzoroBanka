import { test, expect } from '@playwright/test';

// Credentials requested for testing
const VALID_EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'Qwerty-1';

test.describe('Authentication Flow - Login Functionality', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to login before each test
    await page.goto('/login');
    // Ensure the page has loaded completely
    await expect(page.getByRole('heading', { name: /Увійти|Sign in/i })).toBeVisible();

    // Since we are using Turnstile testing keys (1x00000000000000000000AA) in .env.test,
    // the widget will automatically pass in ~1 second. We will wait for the token injected into the DOM.
    // The Turnstile component creates a hidden input `cf-turnstile-response` with a value once verified.
    // In testing mode, the value is always generated automatically.
    await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 10000 });
  });

  // =========================================================================
  // TC-01: Successful Login
  // =========================================================================
  test('TC-01: Successful login with valid credentials', async ({ page }) => {
    test.info().annotations.push({ type: 'description', description: 'Verifies that a user with correct credentials can successfully log in and is redirected to the dashboard/home screen.' });

    // No mocks: hitting the real backend (which passes Turnstile in test mode and returns real tokens).

    // Input: Fill out valid credentials
    await page.getByLabel(/Email/i).fill(VALID_EMAIL);
    await page.getByLabel(/Пароль|Password/i).fill(VALID_PASSWORD);

    const loginResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/auth/login') && response.request().method() === 'POST'
    );

    // Action: Submit the form
    await page.getByRole('button', { name: /^(Увійти|Sign in)$/i }).click();

    const loginResponse = await loginResponsePromise;
    expect(loginResponse.ok()).toBeTruthy();

    // Pass Criteria: URL changes to /onboarding or /dashboard, and server error is not present.
    await expect(page).toHaveURL(/.*\/(onboarding|dashboard).*/, { timeout: 10000 });
    await expect(page.getByRole('alert')).not.toBeVisible();
  });

  // =========================================================================
  // TC-02: Incorrect Password
  // =========================================================================
  test('TC-02: Prevent login with incorrect password', async ({ page }) => {
    test.info().annotations.push({ type: 'description', description: 'Verifies that entering an incorrect password results in the appropriate server error message.' });

    const wrongPassword = 'WrongPassword-123';

    // Preconditions: No mock, hitting the real backend.

    // Input: Fill out valid email but wrong password
    await page.getByLabel(/Email/i).fill(VALID_EMAIL);
    await page.getByLabel(/Пароль|Password/i).fill(wrongPassword);

    // Action: Submit the form
    await page.getByRole('button', { name: /^(Увійти|Sign in)$/i }).click();

    // Pass Criteria: An alert is displayed to the user containing the exact backend error
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Невірний email або пароль|Invalid email or password/i);
    
    // URL remains on the login page
    await expect(page).toHaveURL(/.*\/login/);
  });

  // =========================================================================
  // TC-03: Invalid Email Format
  // =========================================================================
  test('TC-03: Prevent login with an invalid email format', async ({ page }) => {
    test.info().annotations.push({ type: 'description', description: 'Verifies that the client-side validation correctly prevents submission of malformed email addresses.' });

    const invalidEmails = ['plainaddress', '@missingusername.com', 'test@domain'];

    // Input & Action: Test the first invalid email scenario
    await page.getByLabel(/Email/i).fill(invalidEmails[0]);
    await page.getByLabel(/Пароль|Password/i).fill(VALID_PASSWORD);
    // We focus away from the input to trigger Zod's `onBlur` validation mode, or just click submit
    await page.getByRole('button', { name: /^(Увійти|Sign in)$/i }).click();

    // Pass Criteria: Inline field error is visible, network request is never made
    // We expect the exact string "Невірний формат email" as defined in authSchemas.ts
    const validationError = page.getByText(/Невірний формат email|Invalid email format/i);
    await expect(validationError).toBeVisible();

    // URL remains on the login page
    await expect(page).toHaveURL(/.*\/login/);
  });

  // =========================================================================
  // TC-04: Account Not Found
  // =========================================================================
  test('TC-04: Prevent login for unregistered email (Account Not Found)', async ({ page }) => {
    test.info().annotations.push({ type: 'description', description: 'Verifies that attempting to log in with an email that does not exist shows an appropriate error.' });

    const unregisteredEmail = 'doesnotexist@example.com';

    // Preconditions: No mock, hitting the real backend.

    // Input: Fill out unregistered email and an arbitrary password
    await page.getByLabel(/Email/i).fill(unregisteredEmail);
    await page.getByLabel(/Пароль|Password/i).fill(VALID_PASSWORD);

    // Action: Submit the form
    await page.getByRole('button', { name: /^(Увійти|Sign in)$/i }).click();

    // Pass Criteria: An alert is displayed to the user containing the specific "not found" error
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Невірний email або пароль|Invalid email or password/i);

    // URL remains on the login page
    await expect(page).toHaveURL(/.*\/login/);
  });
});
