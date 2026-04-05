import path from 'node:path';
import { test, expect } from './support/fixtures';
import {
  createOrganizationViaApi,
  registerAndSetAuthStorage,
} from './support/e2e-auth';

const receiptFixturePath = path.resolve(process.cwd(), 'public', 'android-chrome-192x192.png');
const itemPhotoFixturePath = path.resolve(process.cwd(), 'public', 'favicon-32x32.png');

test.describe('Dashboard — Receipts', () => {
  test('TC-01: registry opens and leads to real receipt creation flow', async ({
    page,
    receiptsListPage,
    receiptDetailPage,
  }) => {
    const user = await registerAndSetAuthStorage(page);
    const orgId = await createOrganizationViaApi(
      page.request,
      user.auth.accessToken,
      `Receipts Registry ${Date.now()}`,
    );

    await receiptsListPage.goto(orgId);
    await receiptsListPage.waitForReady();
    await expect(receiptsListPage.createButton).toBeVisible();

    await receiptsListPage.createButton.click();
    await receiptDetailPage.waitForReady();
    await expect(receiptDetailPage.title).toContainText('Новий чек');
  });

  test('TC-02: draft restores receipt preview and item photos from backend after reopen', async ({
    page,
    orgSettingsPage,
    receiptsListPage,
    receiptDetailPage,
  }) => {
    const user = await registerAndSetAuthStorage(page);
    const orgId = await createOrganizationViaApi(
      page.request,
      user.auth.accessToken,
      `Receipts Pipeline ${Date.now()}`,
    );

    await orgSettingsPage.goto(orgId);
    await expect(orgSettingsPage.stateApiKeysCard).toBeVisible();
    await orgSettingsPage.saveRegistryKeys(
      `tax-e2e-${Date.now()}`,
      `check-e2e-${Date.now()}`,
    );
    await expect(orgSettingsPage.successAlert).toContainText('Ключі держреєстрів збережено');
    await expect(orgSettingsPage.taxServiceMaskedValue).toContainText('Збережений ключ');
    await expect(orgSettingsPage.checkGovMaskedValue).toContainText('Збережений ключ');

    await receiptDetailPage.gotoNew(orgId);
    await receiptDetailPage.waitForReady();
    await receiptDetailPage.uploadDraft(receiptFixturePath);
    await expect(receiptDetailPage.uploadPreview).toBeVisible();
    await expect(receiptDetailPage.stateId).toHaveText(/[0-9a-f-]{36}/i);

    const receiptId = await receiptDetailPage.getReceiptId();
    const alias = `alias-${Date.now()}`;

    await receiptDetailPage.saveAlias(alias);
    await expect(receiptDetailPage.saveOcrButton).toBeDisabled();

    await receiptDetailPage.openItemsTab();
    await receiptDetailPage.addItemPhoto(itemPhotoFixturePath);
    await expect(receiptDetailPage.itemPhotosList).toBeVisible();
    await expect(receiptDetailPage.itemPhoto(0)).toBeVisible();
    await expect(receiptDetailPage.itemPhotoSource(0)).toHaveText('Збережено на backend');

    await receiptDetailPage.backToListButton.click();
    await receiptsListPage.waitForReady();
    await expect(receiptsListPage.row(receiptId)).toBeVisible();
    await expect(receiptsListPage.alias(receiptId)).toHaveText(alias);

    await receiptsListPage.openReceipt(receiptId);
    await receiptDetailPage.waitForReady();
    await expect(receiptDetailPage.uploadPreview).toBeVisible();
    await receiptDetailPage.openItemsTab();
    await expect(receiptDetailPage.itemPhotosList).toBeVisible();
    await expect(receiptDetailPage.itemPhoto(0)).toBeVisible();
    await expect(receiptDetailPage.itemPhotoSource(0)).toHaveText('Збережено на backend');
  });
});
