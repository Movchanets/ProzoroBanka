import { test, expect } from '@playwright/test';

import { expectAdminRoleInStorage } from './support/admin-fixtures';
import {
  createOrganizationViaApi,
  E2E_TURNSTILE_TEST_TOKEN,
  getAccessTokenFromAuthStorage,
  loginViaUi,
} from './support/e2e-auth';
import { applyLocale, TEST_LOCALES } from './support/locale-matrix';

const VALID_EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'Qwerty-1';

for (const localeConfig of TEST_LOCALES) {
  test.describe(`Admin navigation [${localeConfig.key}]`, () => {
    test.use({ locale: localeConfig.browserLocale });

    test('admin can open admin panel from dashboard', async ({ page }) => {
      await applyLocale(page, localeConfig.uiLanguage);

      await loginViaUi(page, VALID_EMAIL, VALID_PASSWORD, {
        gotoPath: '/login',
        expectedUrlPattern: /.*\/(onboarding|dashboard).*/,
        setLanguage: false,
      });

      await expectAdminRoleInStorage(page);

      const token = await getAccessTokenFromAuthStorage(page);
      const orgId = await createOrganizationViaApi(page.request, token, `Admin nav org ${Date.now()}`);

      await page.goto(`/dashboard/${orgId}`);
      await expect(page.getByTestId('dashboard-admin-link')).toBeVisible();

      await page.getByTestId('dashboard-admin-link').click();
      await expect(page).toHaveURL(/.*\/admin/);
    });

    test('regular user should not see admin transition controls', async ({ page, request }) => {
      await applyLocale(page, localeConfig.uiLanguage);

      const unique = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      const email = `regular-${unique}@example.com`;

      const registerResponse = await request.post(`${process.env.E2E_API_URL ?? 'http://localhost:5188'}/api/auth/register`, {
        data: {
          email,
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
          firstName: 'Regular',
          lastName: 'User',
          turnstileToken: E2E_TURNSTILE_TEST_TOKEN,
        },
      });

      expect(registerResponse.ok()).toBeTruthy();

      await loginViaUi(page, email, VALID_PASSWORD, {
        gotoPath: '/login',
        expectedUrlPattern: /.*\/(onboarding|dashboard).*/,
        setLanguage: false,
      });

      await page.goto('/profile');
      await expect(page.getByTestId('app-shell-admin-link')).toHaveCount(0);
    });
  });
}
