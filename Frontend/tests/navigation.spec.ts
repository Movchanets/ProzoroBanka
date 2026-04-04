import { test, expect } from './support/fixtures';
import { applyLocale, TEST_LOCALES } from './support/locale-matrix';

for (const localeConfig of TEST_LOCALES) {
  test.describe(`Navigation & Public Pages [${localeConfig.key}]`, () => {
    test.use({ locale: localeConfig.browserLocale });

    test('unauthenticated users land on public home from root route', async ({ page, homePage, publicLayout }) => {
      await applyLocale(page, localeConfig.uiLanguage);

      await homePage.goto();
      await expect(page).toHaveURL('/');

      await expect(homePage.mainHeading).toBeVisible();
      await expect(homePage.mainHeading).toHaveText(/\S+/);

      await expect(homePage.heroSection).toBeVisible();
      await expect(publicLayout.toolbarEntryLink).toBeVisible();
    });
  });
}
