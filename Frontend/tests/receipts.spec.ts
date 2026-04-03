import { expect, test } from '@playwright/test';
import {
  createOrganizationForCurrentSession,
  loginViaUi,
} from './support/e2e-auth';

const VALID_EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'Qwerty-1';

test.describe('Dashboard — Receipts Page', () => {
  test('TC-01: receipts page renders functional pipeline controls', async ({ page }) => {
    await loginViaUi(page, VALID_EMAIL, VALID_PASSWORD, {
      expectedUrlPattern: /.*\/(onboarding|dashboard).*/,
    });

    const orgId = await createOrganizationForCurrentSession(
      page,
      `Receipts Test ${Date.now()}`,
    );

    await page.goto(`/dashboard/${orgId}/receipts`);

    await expect(page.getByTestId('dashboard-receipts-page')).toBeVisible();
    await expect(page.getByTestId('dashboard-receipts-title')).toBeVisible();
    await expect(page.getByTestId('dashboard-receipts-upload-card')).toBeVisible();
    await expect(page.getByTestId('dashboard-receipts-upload-file-input')).toBeVisible();
    await expect(page.getByTestId('dashboard-receipts-upload-button')).toBeVisible();
    await expect(page.getByTestId('dashboard-receipts-actions-card')).toBeVisible();
    await expect(page.getByTestId('dashboard-receipts-id-input')).toBeVisible();
    await expect(page.getByTestId('dashboard-receipts-extract-button')).toBeVisible();
    await expect(page.getByTestId('dashboard-receipts-verify-button')).toBeVisible();
    await expect(page.getByTestId('dashboard-receipts-activate-button')).toBeVisible();
    await expect(page.getByTestId('dashboard-receipts-retry-button')).toBeVisible();
    await expect(page.getByTestId('dashboard-receipts-refresh-button')).toBeVisible();
    await expect(page.getByTestId('dashboard-receipts-state-card')).toBeVisible();
    await expect(page.getByTestId('dashboard-receipts-state-empty')).toBeVisible();
  });
});
