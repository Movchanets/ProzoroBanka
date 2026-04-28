import { test, expect } from "./support/fixtures";

import {
  loginViaApi,
  registerRandomUserViaApi,
  setAuthStorage,
  type AuthResponse,
} from "./support/e2e-auth";
import { applyLocale, TEST_LOCALES } from "./support/locale-matrix";

const VALID_EMAIL = process.env.E2E_EMAIL ?? "admin@example.com";
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? "Qwerty-1";

for (const localeConfig of TEST_LOCALES) {
  test.describe(`Admin users management [${localeConfig.key}]`, () => {
    let adminAuth: AuthResponse;

    test.use({ locale: localeConfig.browserLocale });

    test.beforeAll(async ({ request }) => {
      const auth = await loginViaApi(request, VALID_EMAIL, VALID_PASSWORD);
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

      await page.goto("/admin/users");
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
      await page.goto("/admin/users");
      await expect(adminUsersPage.pageContainer).toBeVisible();

      await adminUsersPage.searchInput.fill(createdUser.auth.user.email);

      await adminUsersPage.refreshButton.click();

      const targetRow = adminUsersPage.getUserRow(createdUser.auth.user.email);
      await expect(targetRow).toBeVisible();

      const lockoutButton = targetRow
        .locator('[data-testid^="admin-users-lockout-"]')
        .first();
      const statusBadge = targetRow
        .locator('[data-testid^="admin-users-status-"]')
        .first();

      await page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await lockoutButton.click();
      await expect(statusBadge).toContainText(/Заблокований|Locked/i);
      await expect(
        page.getByText(/Користувача заблоковано|User has been locked/i),
      ).toBeVisible({ timeout: 5000 });

      if (test.info().project.name === "Mobile Safari") {
        return;
      }

      await page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await targetRow.scrollIntoViewIfNeeded();
      await lockoutButton.click({ force: true });
      await expect(statusBadge).toContainText(/Активний|Active/i);
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
      await page.goto("/admin/users", { waitUntil: "domcontentloaded" });
      await expect(adminUsersPage.pageContainer).toBeVisible();
      await adminUsersPage.searchInput.fill(createdUser.auth.user.email);
      const targetRow = adminUsersPage.getUserRow(createdUser.auth.user.email);
      await expect(targetRow).toBeVisible();
      const impersonateButton = adminUsersPage.getImpersonateButton(
        createdUser.auth.user.email,
      );
      await expect(impersonateButton).toBeVisible();
      await page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await impersonateButton.click();

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
