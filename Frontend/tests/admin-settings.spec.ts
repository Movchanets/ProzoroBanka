import { test, expect } from '@playwright/test';

import { seedAdminSession } from './support/admin-fixtures';
import { mockAdminSettings, mockMyOrganizationsNav } from './support/admin-mocks';
import { TEST_LOCALES } from './support/locale-matrix';

for (const localeConfig of TEST_LOCALES) {
  test.describe(`Admin settings [${localeConfig.key}]`, () => {
    test.use({ locale: localeConfig.browserLocale });

    test.beforeEach(async ({ page }) => {
      await seedAdminSession(page, localeConfig.uiLanguage);
      await mockMyOrganizationsNav(page);
      await mockAdminSettings(page);
    });

    test('page loads and shows settings sections', async ({ page }) => {
      await Promise.all([
        page.waitForResponse((response) => response.url().includes('/api/admin/settings/plans') && response.request().method() === 'GET'),
        page.waitForResponse((response) => response.url().includes('/api/admin/settings/general') && response.request().method() === 'GET'),
        page.goto('/admin/settings'),
      ]);

      await expect(page.getByTestId('admin-settings-page')).toBeVisible();
      await expect(page.getByTestId('admin-settings-section-plans')).toBeVisible();
      await expect(page.getByTestId('admin-settings-section-general')).toBeVisible();
    });

    test('can update plan limits', async ({ page }) => {
      await Promise.all([
        page.waitForResponse((response) => response.url().includes('/api/admin/settings/plans') && response.request().method() === 'GET'),
        page.waitForResponse((response) => response.url().includes('/api/admin/settings/general') && response.request().method() === 'GET'),
        page.goto('/admin/settings'),
      ]);
      await expect(page.getByTestId('admin-settings-page')).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId('admin-settings-free-max-members-input')).toBeVisible({ timeout: 15000 });

      await page.getByTestId('admin-settings-free-max-members-input').fill('11');
      await page.getByTestId('admin-settings-paid-max-members-input').fill('210');
      await page.getByTestId('admin-settings-plans-save-button').click();
    });

    test('can update general vars', async ({ page }) => {
      await Promise.all([
        page.waitForResponse((response) => response.url().includes('/api/admin/settings/plans') && response.request().method() === 'GET'),
        page.waitForResponse((response) => response.url().includes('/api/admin/settings/general') && response.request().method() === 'GET'),
        page.goto('/admin/settings'),
      ]);
      await expect(page.getByTestId('admin-settings-page')).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId('admin-settings-max-owned-orgs-input')).toBeVisible({ timeout: 15000 });

      await page.getByTestId('admin-settings-max-owned-orgs-input').fill('12');
      await page.getByTestId('admin-settings-max-joined-orgs-input').fill('25');
      await page.getByTestId('admin-settings-general-save-button').click();
    });
  });
}
