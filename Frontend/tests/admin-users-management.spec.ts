import { test, expect } from './support/fixtures';

import { loginViaApi, registerRandomUserViaApi, setAuthStorage, type AuthResponse } from './support/e2e-auth';
import { applyLocale, TEST_LOCALES } from './support/locale-matrix';

const VALID_EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'Qwerty-1';

async function gotoAdminUsersWithRetry(page: Parameters<typeof test>[0]['page'], adminUsersPage: { pageContainer: ReturnType<Parameters<typeof test>[0]['page']['locator']> }) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/.*\/admin\/users.*/, { timeout: 10_000 });
      await expect(adminUsersPage.pageContainer).toBeVisible({ timeout: 10_000 });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isFirefoxAbort = message.includes('NS_BINDING_ABORTED');
      if (attempt === maxAttempts || !isFirefoxAbort) {
        throw error;
      }
    }
  }
}

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

      await gotoAdminUsersWithRetry(page, adminUsersPage);
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

      await gotoAdminUsersWithRetry(page, adminUsersPage);

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
  });
}
