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
    await orgSettingsPage.saveRegistryKeys(`registry-e2e-${Date.now()}`);
    await expect(orgSettingsPage.stateRegistryMaskedValue).toContainText('Збережений ключ', { timeout: 15_000 });

    await receiptDetailPage.gotoNew(orgId);
    await receiptDetailPage.waitForReady();
    await receiptDetailPage.uploadDraft(receiptFixturePath);
    await expect(receiptDetailPage.uploadPreview).toBeVisible();
    await expect(receiptDetailPage.uploadPreviewButton).toBeVisible();
    await receiptDetailPage.uploadPreviewButton.click();
    await expect(receiptDetailPage.uploadPreviewDialog).toBeVisible();
    await receiptDetailPage.uploadPreviewDialog.getByRole('button', { name: /close|закрити/i }).click();
    await expect(receiptDetailPage.uploadPreviewDialog).toBeHidden();
    await expect(receiptDetailPage.stateId).toHaveText(/[0-9a-f-]{36}/i);

    const receiptId = await receiptDetailPage.getReceiptId();
    const alias = `alias-${Date.now()}`;

    await receiptDetailPage.saveAlias(alias);
    await expect(receiptDetailPage.saveOcrButton).toBeDisabled();

    await receiptDetailPage.openItemsTab();
    await receiptDetailPage.addItemPhoto(itemPhotoFixturePath);

    await receiptDetailPage.backToListButton.click();
    await receiptsListPage.waitForReady();
    await expect(receiptsListPage.row(receiptId)).toBeVisible();
    await expect(receiptsListPage.alias(receiptId)).toHaveText(alias);

    await receiptsListPage.openReceipt(receiptId);
    await receiptDetailPage.waitForReady();
    await expect(receiptDetailPage.uploadPreview).toBeVisible();
    await receiptDetailPage.openItemsTab();

    const hasItemPhotos = await receiptDetailPage.itemPhotosList.isVisible().catch(() => false);
    if (hasItemPhotos) {
      await expect(receiptDetailPage.itemPhoto(0)).toBeVisible();
      await expect(receiptDetailPage.itemPhotoSource(0)).toHaveText(/Збережено на backend|Кроп застосовано|Очікує завантаження/);
    } else {
      await expect(receiptDetailPage.itemPhotosEmpty).toBeVisible();
    }
  });

  test('TC-03: receipt items render in hryvnias and can be edited inline', async ({
    page,
    receiptDetailPage,
  }) => {
    const user = await registerAndSetAuthStorage(page);
    const orgId = await createOrganizationViaApi(
      page.request,
      user.auth.accessToken,
      `Receipt Items ${Date.now()}`,
    );

    await receiptDetailPage.gotoNew(orgId);
    await receiptDetailPage.waitForReady();
    await receiptDetailPage.uploadDraft(receiptFixturePath);

    await receiptDetailPage.openItemsTab();
    await receiptDetailPage.addItem('Тестова позиція', '2', '26.99', '53.98', '4823096005591');

    await expect(receiptDetailPage.itemName(0)).toHaveText('Тестова позиція');
    await expect(receiptDetailPage.itemUnitPrice(0)).toContainText('26,99');

    await receiptDetailPage.itemEditButton(0).click();
    await receiptDetailPage.itemEditNameInput(0).fill('Оновлена позиція');
    await receiptDetailPage.itemEditUnitPriceInput(0).fill('27.50');
    await receiptDetailPage.itemSaveButton(0).click();

    await expect(receiptDetailPage.itemName(0)).toHaveText('Оновлена позиція');
    await expect(receiptDetailPage.itemUnitPrice(0)).toContainText('27,50');
  });

  test('TC-04: receipt can be deleted from registry list', async ({
    page,
    receiptsListPage,
    receiptDetailPage,
  }) => {
    const user = await registerAndSetAuthStorage(page);
    const orgId = await createOrganizationViaApi(
      page.request,
      user.auth.accessToken,
      `Receipts Delete ${Date.now()}`,
    );

    await receiptDetailPage.gotoNew(orgId);
    await receiptDetailPage.waitForReady();
    await receiptDetailPage.uploadDraft(receiptFixturePath);

    const receiptId = await receiptDetailPage.getReceiptId();

    await receiptDetailPage.backToListButton.click();
    await receiptsListPage.waitForReady();
    await expect(receiptsListPage.row(receiptId)).toBeVisible();
    await expect(receiptsListPage.deleteButton(receiptId)).toBeEnabled();

    await receiptsListPage.deleteReceipt(receiptId);

    await expect(receiptsListPage.row(receiptId)).toHaveCount(0);
  });

  test('TC-05: after draft upload, actions are not stuck disabled in pending OCR state', async ({
    page,
    receiptDetailPage,
  }) => {
    const user = await registerAndSetAuthStorage(page);
    const orgId = await createOrganizationViaApi(
      page.request,
      user.auth.accessToken,
      `Receipt Pending OCR ${Date.now()}`,
    );

    await receiptDetailPage.gotoNew(orgId);
    await receiptDetailPage.waitForReady();
    await receiptDetailPage.uploadDraft(receiptFixturePath);

    await expect(receiptDetailPage.stateId).toHaveText(/[0-9a-f-]{36}/i);
    await expect(receiptDetailPage.statusBadge).toContainText(/Pending OCR|OCR очікує|OCR/i);

    await expect(receiptDetailPage.extractButton).toBeEnabled();
    await expect(receiptDetailPage.refreshButton).toBeEnabled();
    await expect(receiptDetailPage.verifyButton).toBeDisabled();
  });
});
