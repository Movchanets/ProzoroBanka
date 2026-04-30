import { test, expect } from "./support/fixtures";

import {
  getSeededAdminCredentials,
  loginViaApi,
  registerRandomUserViaApi,
  setAuthStorage,
  type AuthResponse,
} from "./support/e2e-auth";
import { applyLocale, TEST_LOCALES } from "./support/locale-matrix";

const seededAdmin = getSeededAdminCredentials();

for (const localeConfig of TEST_LOCALES) {
  test.describe(`Admin users management [${localeConfig.key}]`, () => {
    let adminAuth: AuthResponse;

    test.use({ locale: localeConfig.browserLocale });

    test.beforeAll(async ({ request }) => {
      const auth = await loginViaApi(
        request,
        seededAdmin.email,
        seededAdmin.password,
      );
      adminAuth = {
        ...auth,
        user: {
          ...auth.user,
          roles: ["Admin"],
        },
      };
    });

    test("TC-01: admin can access users and roles pages", async ({
      page,
      adminUsersPage,
      adminRolesPage,
    }) => {
      await applyLocale(page, localeConfig.uiLanguage);
      await setAuthStorage(page, adminAuth);
      await adminUsersPage.goto();
      await expect(adminUsersPage.pageContainer).toBeVisible();
      await expect(adminUsersPage.filters).toBeVisible();

      await page.goto("/admin/roles");
      await expect(page).toHaveURL(/.*\/admin\/roles/);
      await expect(adminRolesPage.pageContainer).toBeVisible();
    });

    test("TC-02: admin can filter and lock or unlock user", async ({
      page,
      request,
      adminUsersPage,
    }) => {
      await applyLocale(page, localeConfig.uiLanguage);

      const createdUser = await registerRandomUserViaApi(request, {
        firstName: "Filter",
        lastName: "Target",
        emailPrefix: `admin-filter-${localeConfig.key}`,
      });

      await setAuthStorage(page, adminAuth);
      await adminUsersPage.goto();
      await expect(adminUsersPage.pageContainer).toBeVisible();

      await adminUsersPage.searchByEmail(createdUser.auth.user.email);
      await adminUsersPage.refresh();

      const targetRow = adminUsersPage.getUserRow(createdUser.auth.user.email);
      await expect(targetRow).toBeVisible();

      await adminUsersPage.toggleLockoutWithConfirmation(
        createdUser.auth.user.email,
      );
      await expect(
        adminUsersPage.getStatusBadge(createdUser.auth.user.email),
      ).toContainText(/Заблокований|Locked/i);
      await expect(
        page.getByText(/Користувача заблоковано|User locked/i),
      ).toBeVisible({ timeout: 5000 });

      if (test.info().project.name === "Mobile Safari") {
        return;
      }

      await targetRow.scrollIntoViewIfNeeded();
      await adminUsersPage.toggleLockoutWithConfirmation(
        createdUser.auth.user.email,
      );
      await expect(
        adminUsersPage.getStatusBadge(createdUser.auth.user.email),
      ).toContainText(/Активний|Active/i);
    });

    test("TC-03: user with impersonation permission can switch session from admin users table", async ({
      page,
      request,
      adminUsersPage,
    }) => {
      await applyLocale(page, localeConfig.uiLanguage);

      const createdUser = await registerRandomUserViaApi(request, {
        firstName: "Impersonated",
        lastName: "Target",
        emailPrefix: `admin-impersonation-${localeConfig.key}`,
      });
      await page.route("**/api/admin/roles", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              name: "Admin",
              description: "Administrator",
              permissions: ["users.impersonate"],
            },
          ]),
        });
      });

      await setAuthStorage(page, adminAuth);
      await adminUsersPage.goto();
      await expect(adminUsersPage.pageContainer).toBeVisible();
      await adminUsersPage.searchByEmail(createdUser.auth.user.email);
      const targetRow = adminUsersPage.getUserRow(createdUser.auth.user.email);
      await expect(targetRow).toBeVisible();
      await expect(
        adminUsersPage.getImpersonateButton(createdUser.auth.user.email),
      ).toBeVisible();
      await adminUsersPage.impersonateWithConfirmation(
        createdUser.auth.user.email,
      );

      await expect
        .poll(
          async () => {
            const raw = await page.evaluate(() =>
              localStorage.getItem("auth-storage"),
            );
            if (!raw) {
              return null;
            }

            const parsed = JSON.parse(raw) as {
              state?: { user?: { email?: string } };
            };
            return parsed.state?.user?.email ?? null;
          },
          { timeout: 15_000 },
        )
        .toBe(createdUser.auth.user.email);

      const authEmail = await page.evaluate(() => {
        const raw = localStorage.getItem("auth-storage");
        if (!raw) {
          return null;
        }

        const parsed = JSON.parse(raw) as {
          state?: { user?: { email?: string } };
        };
        return parsed.state?.user?.email ?? null;
      });
      expect(authEmail).toBe(createdUser.auth.user.email);
    });
  });
}
