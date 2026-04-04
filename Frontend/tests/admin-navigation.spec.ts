import { test, expect } from './support/fixtures';
import { expectAdminRoleInStorage } from './support/admin-fixtures';
import {
  createOrganizationViaApi,
  getAccessTokenFromAuthStorage,
  loginViaUi,
  registerAndSetAuthStorage,
} from './support/e2e-auth';
import { applyLocale, TEST_LOCALES } from './support/locale-matrix';

const VALID_EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'Qwerty-1';

for (const localeConfig of TEST_LOCALES) {
  test.describe(`Admin navigation [${localeConfig.key}]`, () => {
    test.use({ locale: localeConfig.browserLocale });

    test('admin can open admin panel from dashboard', async ({ page, dashboardPage }) => {
      await applyLocale(page, localeConfig.uiLanguage);

      await loginViaUi(page, VALID_EMAIL, VALID_PASSWORD, {
        gotoPath: '/login',
        expectedUrlPattern: /.*\/(onboarding|dashboard).*/,
        setLanguage: false,
      });

      await expectAdminRoleInStorage(page);

      const token = await getAccessTokenFromAuthStorage(page);
      const orgId = await createOrganizationViaApi(page.request, token, `Admin nav org ${Date.now()}`);

      await dashboardPage.goto(orgId);
      await expect(dashboardPage.adminLink).toBeVisible();

      await dashboardPage.clickAdminLink();
      await expect(page).toHaveURL(/.*\/admin/);
    });

    test('regular user should not see admin transition controls', async ({ page, profilePage }) => {
      await applyLocale(page, localeConfig.uiLanguage);

      await registerAndSetAuthStorage(page);

      await profilePage.goto();
      await expect(profilePage.appShellAdminLink).toHaveCount(0);
    });
  });
}
