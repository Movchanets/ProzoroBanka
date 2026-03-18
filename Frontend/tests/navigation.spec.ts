import { test, expect } from '@playwright/test';

import en from '../src/i18n/locales/en.json' with { type: 'json' };
import uk from '../src/i18n/locales/uk.json' with { type: 'json' };

const locales = [
  { key: 'uk', browserLocale: 'uk-UA', uiLanguage: 'uk', dictionary: uk },
  { key: 'en', browserLocale: 'en-US', uiLanguage: 'en', dictionary: en },
] as const;

for (const localeConfig of locales) {
  test.describe(`Navigation & Public Pages [${localeConfig.key}]`, () => {
    test.use({ locale: localeConfig.browserLocale });

    test('unauthenticated users are securely redirected from root to login route', async ({ page }) => {
      await page.addInitScript((lang) => {
        localStorage.setItem('prozoro-banka-lang', lang);
      }, localeConfig.uiLanguage);

      await page.goto('/');
      await expect(page).toHaveURL(/.*\/login/);

      const mainHeading = page.getByRole('heading', { level: 1 });
      await expect(mainHeading).toContainText(localeConfig.dictionary.auth.login.heroTitle);

      await expect(page.getByTestId('login-email-input')).toBeVisible();
    });
  });
}
