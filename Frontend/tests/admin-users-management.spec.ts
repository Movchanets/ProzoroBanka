import { test, expect } from './support/fixtures';

import { loginViaApi, registerRandomUserViaApi, setAuthStorage, type AuthResponse } from './support/e2e-auth';
import { applyLocale, TEST_LOCALES } from './support/locale-matrix';

const VALID_EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'Qwerty-1';

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
          roles: ['Admin'],
        },
      };
    });

    test('TC-01: admin can access users and roles pages', async ({ page, adminUsersPage, adminRolesPage, dashboardPage }) => {
      await applyLocale(page, localeConfig.uiLanguage);
      await setAuthStorage(page, adminAuth);
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/.*\/(onboarding|dashboard).*/, { timeout: 10_000 });

      await page.goto('/admin/users');
      await expect(adminUsersPage.pageContainer).toBeVisible();
      await expect(adminUsersPage.filters).toBeVisible();

      if (test.info().project.name === 'Mobile Safari') {
        await page.goto('/admin/roles');
      } else {
        await dashboardPage.getAdminNavLink('roles').click();
      }

      await expect(page).toHaveURL(/.*\/admin\/roles/);
      await expect(adminRolesPage.pageContainer).toBeVisible();
    });

    test('TC-02: admin can filter and lock or unlock user', async ({ page, request, adminUsersPage }) => {
      await applyLocale(page, localeConfig.uiLanguage);

      const createdUser = await registerRandomUserViaApi(request, {
        firstName: 'Filter',
        lastName: 'Target',
        emailPrefix: `admin-filter-${localeConfig.key}`,
      });

      await setAuthStorage(page, adminAuth);
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/.*\/(onboarding|dashboard).*/, { timeout: 10_000 });

      await page.goto('/admin/users');
      await expect(adminUsersPage.pageContainer).toBeVisible();

      await adminUsersPage.searchInput.fill(createdUser.auth.user.email);
      await expect
        .poll(
          async () => {
            const params = new URLSearchParams(new URL(page.url()).search);
            return params.get('search');
          },
          { timeout: 10_000 },
        )
        .toBe(createdUser.auth.user.email);

      await adminUsersPage.refreshButton.click();

      const targetRow = adminUsersPage.getUserRow(createdUser.auth.user.email);
      await expect(targetRow).toBeVisible();

      const lockoutButton = targetRow.locator('[data-testid^="admin-users-lockout-"]').first();
      const statusBadge = targetRow.locator('[data-testid^="admin-users-status-"]').first();

      await page.once('dialog', async (dialog) => {
        await dialog.accept();
      });
      await lockoutButton.click();
      await expect(statusBadge).toContainText(/Заблокований|Locked/i);
      await expect(page.getByText(/Користувача заблоковано|User has been locked/i)).toBeVisible({ timeout: 5000 });

      if (test.info().project.name === 'Mobile Safari') {
        return;
      }

      await page.once('dialog', async (dialog) => {
        await dialog.accept();
      });
      await targetRow.scrollIntoViewIfNeeded();
      await lockoutButton.click({ force: true });
      await expect(statusBadge).toContainText(/Активний|Active/i);
    });

    test('TC-03: user with impersonation permission can switch session from admin users table', async ({ page, request, adminUsersPage }) => {
      await applyLocale(page, localeConfig.uiLanguage);

      const createdUser = await registerRandomUserViaApi(request, {
        firstName: 'Impersonated',
        lastName: 'Target',
        emailPrefix: `admin-impersonation-${localeConfig.key}`,
      });

      let impersonationRequested = false;

      await page.route('**/api/admin/roles', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              name: 'Admin',
              description: 'Адміністратор',
              permissions: ['users.impersonate'],
            },
          ]),
        });
      });

      await page.route(`**/api/admin/users/${createdUser.auth.user.id}/impersonate`, async (route) => {
        impersonationRequested = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'impersonated-access-token',
            refreshToken: 'impersonated-refresh-token',
            accessTokenExpiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            refreshTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }),
        });
      });

      await page.route('**/api/auth/me', async (route) => {
        if (!impersonationRequested) {
          await route.fallback();
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: createdUser.auth.user.id,
            email: createdUser.auth.user.email,
            firstName: createdUser.auth.user.firstName,
            lastName: createdUser.auth.user.lastName,
            roles: createdUser.auth.user.roles,
          }),
        });
      });

      await setAuthStorage(page, adminAuth);
      await page.goto('/admin/users');
      await expect(adminUsersPage.pageContainer).toBeVisible();

      await adminUsersPage.searchInput.fill(createdUser.auth.user.email);
      const targetRow = adminUsersPage.getUserRow(createdUser.auth.user.email);
      await expect(targetRow).toBeVisible();

      const impersonateButton = adminUsersPage.getImpersonateButton(createdUser.auth.user.email);
      await expect(impersonateButton).toBeVisible();

      await page.once('dialog', async (dialog) => {
        await dialog.accept();
      });
      await impersonateButton.click();

      await expect(page).toHaveURL(/.*\/onboarding.*/);

      const authEmail = await page.evaluate(() => {
        const raw = localStorage.getItem('auth-storage');
        if (!raw) {
          return null;
        }

        const parsed = JSON.parse(raw) as { state?: { user?: { email?: string } } };
        return parsed.state?.user?.email ?? null;
      });

      expect(authEmail).toBe(createdUser.auth.user.email);
    });
  });
}
