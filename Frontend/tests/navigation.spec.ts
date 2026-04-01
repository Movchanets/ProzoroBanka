import { test, expect } from '@playwright/test';

import { applyLocale, TEST_LOCALES } from './support/locale-matrix';

for (const localeConfig of TEST_LOCALES) {
  test.describe(`Navigation & Public Pages [${localeConfig.key}]`, () => {
    test.use({ locale: localeConfig.browserLocale });

    test('unauthenticated users land on public home from root route', async ({ page }) => {
      await applyLocale(page, localeConfig.uiLanguage);

      await page.goto('/');
      await expect(page).toHaveURL('/');

      const mainHeading = page.getByRole('heading', { level: 1 });
      await expect(mainHeading).toBeVisible();
      await expect(mainHeading).toHaveText(/\S+/);

      await expect(page.getByTestId('home-hero-section')).toBeVisible();
      await expect(page.getByTestId('public-page-toolbar-entry-link')).toBeVisible();
    });
  });
}
