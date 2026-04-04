import { test, expect } from './support/fixtures';

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

    test('page loads and shows settings sections', async ({ page, adminSettingsPage }) => {
      await Promise.all([
        page.waitForResponse((response) => response.url().includes('/api/admin/settings/plans') && response.request().method() === 'GET'),
        page.waitForResponse((response) => response.url().includes('/api/admin/settings/general') && response.request().method() === 'GET'),
        page.goto('/admin/settings'),
      ]);

      await expect(adminSettingsPage.pageContainer).toBeVisible();
      await expect(adminSettingsPage.sectionPlans).toBeVisible();
      await expect(adminSettingsPage.sectionGeneral).toBeVisible();
    });

    test('can update plan limits', async ({ page, adminSettingsPage }) => {
      await Promise.all([
        page.waitForResponse((response) => response.url().includes('/api/admin/settings/plans') && response.request().method() === 'GET'),
        page.waitForResponse((response) => response.url().includes('/api/admin/settings/general') && response.request().method() === 'GET'),
        page.goto('/admin/settings'),
      ]);
      await expect(adminSettingsPage.pageContainer).toBeVisible({ timeout: 15000 });
      await expect(adminSettingsPage.freeMaxMembersInput).toBeVisible({ timeout: 15000 });

      await adminSettingsPage.freeMaxMembersInput.fill('11');
      await adminSettingsPage.paidMaxMembersInput.fill('210');
      await adminSettingsPage.plansSaveButton.click();
    });

    test('can update general vars', async ({ page, adminSettingsPage }) => {
      await Promise.all([
        page.waitForResponse((response) => response.url().includes('/api/admin/settings/plans') && response.request().method() === 'GET'),
        page.waitForResponse((response) => response.url().includes('/api/admin/settings/general') && response.request().method() === 'GET'),
        page.goto('/admin/settings'),
      ]);
      await expect(adminSettingsPage.pageContainer).toBeVisible({ timeout: 15000 });
      await expect(adminSettingsPage.maxOwnedOrgsInput).toBeVisible({ timeout: 15000 });

      await adminSettingsPage.maxOwnedOrgsInput.fill('12');
      await adminSettingsPage.maxJoinedOrgsInput.fill('25');
      await adminSettingsPage.generalSaveButton.click();
    });
  });
}
