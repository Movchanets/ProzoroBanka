import { test, expect } from '@playwright/test';

import en from '../src/i18n/locales/en.json' with { type: 'json' };
import uk from '../src/i18n/locales/uk.json' with { type: 'json' };

// Credentials requested for testing
const VALID_EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'Qwerty-1';

const locales = {
  uk: {
    browserLocale: 'uk-UA',
    uiLanguage: 'uk',
    dictionary: uk,
  },
  en: {
    browserLocale: 'en-US',
    uiLanguage: 'en',
    dictionary: en,
  },
} as const;

for (const [localeKey, localeConfig] of Object.entries(locales) as Array<[keyof typeof locales, (typeof locales)[keyof typeof locales]]>) {
  test.describe(`Authentication Flow - Login Functionality [${localeKey}]`, () => {
    test.use({ locale: localeConfig.browserLocale });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => {
        localStorage.setItem('prozoro-banka-lang', lang);
      }, localeConfig.uiLanguage);

      await page.goto('/login');
      await expect(page.getByRole('heading', { name: localeConfig.dictionary.auth.login.title })).toBeVisible();
      await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20000 });
    });

    test('TC-01: Successful login with valid credentials', async ({ page }) => {
      test.info().annotations.push({ type: 'description', description: 'Verifies that a user with correct credentials can successfully log in and is redirected to the dashboard/home screen.' });

      await page.getByTestId('login-email-input').fill(VALID_EMAIL);
      await page.getByTestId('login-password-input').fill(VALID_PASSWORD);

      const loginResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/auth/login') && response.request().method() === 'POST'
      );

      await page.getByTestId('login-submit-button').click();

      const loginResponse = await loginResponsePromise;
      expect(loginResponse.ok()).toBeTruthy();

      await expect(page).toHaveURL(/.*\/(onboarding|dashboard).*/, { timeout: 10000 });
      await expect(page.getByTestId('login-error-alert')).not.toBeVisible();
    });

    test('TC-02: Prevent login with incorrect password', async ({ page }) => {
      test.info().annotations.push({ type: 'description', description: 'Verifies that entering an incorrect password results in a visible login error alert and no redirect.' });

      await page.getByTestId('login-email-input').fill(VALID_EMAIL);
      await page.getByTestId('login-password-input').fill('WrongPassword-123');

      await page.getByTestId('login-submit-button').click();

      await expect(page.getByTestId('login-error-alert')).toBeVisible();
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('TC-03: Prevent login with an invalid email format', async ({ page }) => {
      test.info().annotations.push({ type: 'description', description: 'Verifies that client validation blocks malformed email input before successful login.' });

      await page.getByTestId('login-email-input').fill('plainaddress');
      await page.getByTestId('login-password-input').fill(VALID_PASSWORD);
      await page.getByTestId('login-submit-button').click();

      await expect(page.getByText(localeConfig.dictionary.validation.emailInvalid)).toBeVisible();
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('TC-04: Prevent login for unregistered email', async ({ page }) => {
      test.info().annotations.push({ type: 'description', description: 'Verifies that unknown email login attempts keep user on the login page and show an error alert.' });

      await page.getByTestId('login-email-input').fill('doesnotexist@example.com');
      await page.getByTestId('login-password-input').fill(VALID_PASSWORD);

      await page.getByTestId('login-submit-button').click();

      await expect(page.getByTestId('login-error-alert')).toBeVisible();
      await expect(page).toHaveURL(/.*\/login/);
    });
  });
}
