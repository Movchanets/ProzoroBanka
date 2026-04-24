import { test, expect } from './support/fixtures';
import { E2E_TURNSTILE_TEST_TOKEN, waitForTurnstileToken } from './support/e2e-auth';
import { applyLocale, TEST_LOCALES } from './support/locale-matrix';

import en from '../src/i18n/locales/en.json' with { type: 'json' };
import uk from '../src/i18n/locales/uk.json' with { type: 'json' };

const VALID_EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'Qwerty-1';

const locales = {
  uk: { browserLocale: 'uk-UA', dictionary: uk },
  en: { browserLocale: 'en-US', dictionary: en },
} as const;

for (const localeConfig of TEST_LOCALES) {
  const localeKey = localeConfig.key;
  const localeDictionary = locales[localeKey].dictionary;

  test.describe(`Authentication Flow - Login Functionality [${localeKey}]`, () => {
    test.describe.configure({ timeout: 60_000 });
    test.use({ locale: localeConfig.browserLocale });

    test.beforeEach(async ({ page, loginPage }) => {
      await applyLocale(page, localeConfig.uiLanguage);
      
      await loginPage.goto();
      await expect(loginPage.getHeading(localeDictionary.auth.login.title)).toBeVisible();
      await waitForTurnstileToken(page, { timeoutMs: 20_000 });
    });

    test('TC-01: Successful login with valid credentials', async ({ page, loginPage }) => {
      test.info().annotations.push({ type: 'description', description: 'Verifies that a user with correct credentials can successfully log in and is redirected to the dashboard/home screen.' });

      const visitedUrls: string[] = [];
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) {
          visitedUrls.push(frame.url());
        }
      });

      await loginPage.fillEmail(VALID_EMAIL);
      await loginPage.fillPassword(VALID_PASSWORD);
      await waitForTurnstileToken(page, { timeoutMs: 20_000 });

      const loginResponsePromise = loginPage.waitForLoginResponse();
      await loginPage.submit();

      const loginResponse = await loginResponsePromise;
      const loginRequestPayload = loginResponse.request().postDataJSON() as { turnstileToken?: string };
      
      expect(loginResponse.ok(), `Login failed (${loginResponse.status()}): ${await loginResponse.text()}`).toBeTruthy();
      expect(typeof loginRequestPayload.turnstileToken).toBe('string');
      expect(loginRequestPayload.turnstileToken?.trim().length ?? 0).toBeGreaterThan(0);
      expect(loginRequestPayload.turnstileToken).toBe(E2E_TURNSTILE_TEST_TOKEN);

      await expect(page).toHaveURL(/.*\/(onboarding|dashboard).*/, { timeout: 10000 });
      expect(visitedUrls.some((url) => /\/onboarding(?:$|[/?#])/.test(url))).toBeFalsy();
      await expect(loginPage.errorAlert).not.toBeVisible();
    });

    test('TC-02: Prevent login with incorrect password', async ({ page, loginPage }) => {
      test.info().annotations.push({ type: 'description', description: 'Verifies that entering an incorrect password results in a visible login error alert and no redirect.' });

      await loginPage.fillEmail(VALID_EMAIL);
      await loginPage.fillPassword('WrongPassword-123');
      await waitForTurnstileToken(page, { timeoutMs: 20_000 });
      await loginPage.submit();

      await expect(loginPage.errorAlert).toBeVisible();
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('TC-03: Prevent login with an invalid email format', async ({ page, loginPage }) => {
      test.info().annotations.push({ type: 'description', description: 'Verifies that client validation blocks malformed email input before successful login.' });

      await loginPage.fillEmail('plainaddress');
      await loginPage.fillPassword(VALID_PASSWORD);
      await waitForTurnstileToken(page, { timeoutMs: 20_000 });
      await loginPage.submit();

      await expect(loginPage.getValidationMessage(localeDictionary.validation.emailInvalid)).toBeVisible();
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('TC-04: Prevent login for unregistered email', async ({ page, loginPage }) => {
      test.info().annotations.push({ type: 'description', description: 'Verifies that unknown email login attempts keep user on the login page and show an error alert.' });

      await loginPage.fillEmail('doesnotexist@example.com');
      await loginPage.fillPassword(VALID_PASSWORD);
      await waitForTurnstileToken(page, { timeoutMs: 20_000 });
      await loginPage.submit();

      await expect(loginPage.errorAlert).toBeVisible();
      await expect(page).toHaveURL(/.*\/login/);
    });
  });
}
