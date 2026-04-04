import { test, expect } from './support/fixtures';
import {
  createOrganizationViaApi,
  registerAndSetAuthStorage,
} from './support/e2e-auth';

test.describe('Dashboard — Receipts Page', () => {
  test('TC-01: receipts page renders functional pipeline controls', async ({ page, dashboardReceiptsPage }) => {
    const user = await registerAndSetAuthStorage(page);

    const orgId = await createOrganizationViaApi(
      page.request,
      user.auth.accessToken,
      `Receipts Test ${Date.now()}`,
    );

    await dashboardReceiptsPage.goto(orgId);

    await expect(dashboardReceiptsPage.pageContainer).toBeVisible();
    await expect(dashboardReceiptsPage.title).toBeVisible();
    await expect(dashboardReceiptsPage.uploadCard).toBeVisible();
    await expect(dashboardReceiptsPage.fileInput).toBeVisible();
    await expect(dashboardReceiptsPage.uploadButton).toBeVisible();
    await expect(dashboardReceiptsPage.actionsCard).toBeVisible();
    await expect(dashboardReceiptsPage.idInput).toBeVisible();
    await expect(dashboardReceiptsPage.extractButton).toBeVisible();
    await expect(dashboardReceiptsPage.verifyButton).toBeVisible();
    await expect(dashboardReceiptsPage.activateButton).toBeVisible();
    await expect(dashboardReceiptsPage.retryButton).toBeVisible();
    await expect(dashboardReceiptsPage.refreshButton).toBeVisible();
    await expect(dashboardReceiptsPage.stateCard).toBeVisible();
    await expect(dashboardReceiptsPage.stateEmpty).toBeVisible();
  });
});
