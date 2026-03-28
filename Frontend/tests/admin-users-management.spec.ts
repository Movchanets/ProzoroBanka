import { test, expect } from '@playwright/test';

import en from '../src/i18n/locales/en.json' with { type: 'json' };
import uk from '../src/i18n/locales/uk.json' with { type: 'json' };
import { loginViaUi, registerRandomUserViaApi } from './support/e2e-auth';

const VALID_EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'Qwerty-1';

const locales = [
  { key: 'uk', browserLocale: 'uk-UA', uiLanguage: 'uk', dictionary: uk },
  { key: 'en', browserLocale: 'en-US', uiLanguage: 'en', dictionary: en },
] as const;

for (const localeConfig of locales) {
  test.describe(`Admin users management [${localeConfig.key}]`, () => {
    test.use({ locale: localeConfig.browserLocale });

    test('TC-01: admin can access users and roles pages', async ({ page }) => {
      await page.addInitScript((lang) => {
        localStorage.setItem('prozoro-banka-lang', lang);
      }, localeConfig.uiLanguage);

      await loginViaUi(page, VALID_EMAIL, VALID_PASSWORD, {
        gotoPath: '/login',
        expectedUrlPattern: /.*\/(onboarding|dashboard).*/,
        setLanguage: false,
      });

      await expect
        .poll(
          async () =>
            page.evaluate(() => {
              const raw = localStorage.getItem('auth-storage');
              if (!raw) return false;

              const parsed = JSON.parse(raw) as { state?: { user?: { roles?: string[] } } };
              const roles = parsed.state?.user?.roles ?? [];
              return roles.some((role) => role.toLowerCase() === 'admin');
            }),
          { timeout: 10_000 },
        )
        .toBe(true);

      await page.goto('/admin/users');
      await expect(page.getByTestId('admin-users-page')).toBeVisible();
      await expect(page.getByTestId('admin-users-filters')).toBeVisible();

      if (test.info().project.name === 'Mobile Safari') {
        await page.goto('/admin/roles');
      } else {
        await page.getByTestId('admin-nav-roles').click();
      }

      await expect(page).toHaveURL(/.*\/admin\/roles/);
      await expect(page.getByTestId('admin-roles-page')).toBeVisible();
    });

    test('TC-02: admin can filter and lock or unlock user', async ({ page, request }) => {
      await page.addInitScript((lang) => {
        localStorage.setItem('prozoro-banka-lang', lang);
      }, localeConfig.uiLanguage);

      const createdUser = await registerRandomUserViaApi(request, {
        firstName: 'Filter',
        lastName: 'Target',
        emailPrefix: `admin-filter-${localeConfig.key}`,
      });

      await loginViaUi(page, VALID_EMAIL, VALID_PASSWORD, {
        gotoPath: '/login',
        expectedUrlPattern: /.*\/(onboarding|dashboard).*/,
        setLanguage: false,
      });

      await expect
        .poll(
          async () =>
            page.evaluate(() => {
              const raw = localStorage.getItem('auth-storage');
              if (!raw) return false;

              const parsed = JSON.parse(raw) as { state?: { user?: { roles?: string[] } } };
              const roles = parsed.state?.user?.roles ?? [];
              return roles.some((role) => role.toLowerCase() === 'admin');
            }),
          { timeout: 10_000 },
        )
        .toBe(true);

      await page.goto('/admin/users');
      await expect(page.getByTestId('admin-users-page')).toBeVisible();

      await page.getByTestId('admin-users-search-input').fill(createdUser.auth.user.email);
      await expect
        .poll(
          async () => {
            const params = new URLSearchParams(new URL(page.url()).search);
            return params.get('search');
          },
          { timeout: 10_000 },
        )
        .toBe(createdUser.auth.user.email);

      await page.getByTestId('admin-users-refresh-button').click();

      const targetRow = page
        .locator('[data-testid^="admin-users-row-"]')
        .filter({ hasText: createdUser.auth.user.email })
        .first();
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
