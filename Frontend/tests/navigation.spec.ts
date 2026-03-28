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

    test('unauthenticated users land on public home from root route', async ({ page }) => {
      await page.addInitScript((lang) => {
        localStorage.setItem('prozoro-banka-lang', lang);
      }, localeConfig.uiLanguage);

      await page.goto('/');
      await expect(page).toHaveURL('/');

      const mainHeading = page.getByRole('heading', { level: 1 });
      await expect(mainHeading).toContainText('Прозора підтримка для волонтерських команд');

      await expect(page.getByTestId('home-hero-section')).toBeVisible();
      await expect(page.getByTestId('public-page-toolbar-entry-link')).toBeVisible();
    });
  });
}
