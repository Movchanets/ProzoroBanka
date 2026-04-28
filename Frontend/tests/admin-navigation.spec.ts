import { test, expect } from "./support/fixtures";
import { expectAdminRoleInStorage } from "./support/admin-fixtures";
import {
  getAccessTokenFromAuthStorage,
  getSeededAdminCredentials,
  loginViaUi,
  registerAndSetAuthStorage,
} from "./support/e2e-auth";
import { ensureDashboardPath } from "./support/navigation";
import { applyLocale, TEST_LOCALES } from "./support/locale-matrix";

const seededAdmin = getSeededAdminCredentials();

for (const localeConfig of TEST_LOCALES) {
  test.describe(`Admin navigation [${localeConfig.key}]`, () => {
    test.use({ locale: localeConfig.browserLocale });

    test("admin can open admin panel from dashboard", async ({
      page,
      dashboardPage,
    }) => {
      await applyLocale(page, localeConfig.uiLanguage);

      await loginViaUi(page, seededAdmin.email, seededAdmin.password, {
        gotoPath: "/login",
        expectedUrlPattern: /.*\/(onboarding|dashboard).*/,
        setLanguage: false,
      });

      await expectAdminRoleInStorage(page);

      await getAccessTokenFromAuthStorage(page);
      await ensureDashboardPath(
        page,
        `Admin Navigation ${localeConfig.key} ${Date.now()}`,
      );

      await expect(dashboardPage.adminLink).toBeVisible();

      await dashboardPage.clickAdminLink();
      await expect(page).toHaveURL(/.*\/admin/);
    });

    test("regular user should not see admin transition controls", async ({
      page,
      profilePage,
    }) => {
      await applyLocale(page, localeConfig.uiLanguage);

      await registerAndSetAuthStorage(page);

      await profilePage.goto();
      await expect(profilePage.appShellAdminLink).toHaveCount(0);
    });
  });
}
