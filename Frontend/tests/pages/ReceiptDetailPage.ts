import { expect, type Locator, type Page } from '@playwright/test';

export class ReceiptDetailPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly title: Locator;
  readonly uploadFileInput: Locator;
  readonly uploadButton: Locator;
  readonly uploadPreview: Locator;
  readonly uploadPreviewButton: Locator;
  readonly uploadPreviewDialog: Locator;
  readonly itemsTab: Locator;
  readonly itemsCard: Locator;
  readonly itemPhotosInput: Locator;
  readonly itemPhotosList: Locator;
  readonly itemPhotosEmpty: Locator;
  readonly addItemNameInput: Locator;
  readonly addItemQuantityInput: Locator;
  readonly addItemUnitPriceInput: Locator;
  readonly addItemTotalPriceInput: Locator;
  readonly addItemBarcodeInput: Locator;
  readonly addItemButton: Locator;
  readonly aliasInput: Locator;
  readonly saveOcrButton: Locator;
  readonly extractButton: Locator;
  readonly refreshButton: Locator;
  readonly verifyButton: Locator;
  readonly statusBadge: Locator;
  readonly stateId: Locator;
  readonly backToListButton: Locator;
  readonly cropDialog: Locator;
  readonly cropSaveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('dashboard-receipts-page');
    this.title = page.getByTestId('dashboard-receipts-title');
    this.uploadFileInput = page.getByTestId('dashboard-receipts-upload-file-input');
    this.uploadButton = page.getByTestId('dashboard-receipts-upload-button');
    this.uploadPreview = page.getByTestId('dashboard-receipts-upload-preview');
    this.uploadPreviewButton = page.getByTestId('dashboard-receipts-upload-preview-button');
    this.uploadPreviewDialog = page.getByTestId('dashboard-receipts-upload-preview-dialog');
    this.itemsTab = page.getByTestId('dashboard-receipts-upload-tab-items');
    this.itemsCard = page.getByTestId('dashboard-receipts-items-card');
    this.itemPhotosInput = page.getByTestId('dashboard-receipts-items-files-input');
    this.itemPhotosList = page.getByTestId('dashboard-receipts-items-files-list');
    this.itemPhotosEmpty = page.getByTestId('dashboard-receipts-item-photos-empty-hint');
    this.addItemNameInput = page.getByTestId('dashboard-receipts-add-item-name-input');
    this.addItemQuantityInput = page.getByTestId('dashboard-receipts-add-item-quantity-input');
    this.addItemUnitPriceInput = page.getByTestId('dashboard-receipts-add-item-unit-price-input');
    this.addItemTotalPriceInput = page.getByTestId('dashboard-receipts-add-item-total-price-input');
    this.addItemBarcodeInput = page.getByTestId('dashboard-receipts-add-item-barcode-input');
    this.addItemButton = page.getByTestId('dashboard-receipts-add-item-button');
    this.aliasInput = page.getByTestId('dashboard-receipts-alias-input');
    this.saveOcrButton = page.getByTestId('dashboard-receipts-save-ocr-button');
    this.extractButton = page.getByTestId('dashboard-receipts-extract-button');
    this.refreshButton = page.getByTestId('dashboard-receipts-refresh-button');
    this.verifyButton = page.getByTestId('dashboard-receipts-verify-button');
    this.statusBadge = page.getByTestId('dashboard-receipts-status-badge');
    this.stateId = page.getByTestId('dashboard-receipts-state-id');
    this.backToListButton = page.getByTestId('dashboard-receipts-back-to-list-button');
    this.cropDialog = page.getByRole('dialog');
    this.cropSaveButton = this.cropDialog.getByRole('button', { name: /зберегти|save/i });
  }

  async gotoNew(orgId: string) {
    await this.page.goto(`/dashboard/${orgId}/receipts/new`);
  }

  async waitForReady() {
    await expect(this.pageContainer).toBeVisible();
  }

  async confirmCrop() {
    await expect(this.cropDialog).toBeVisible();
    await this.cropSaveButton.click();
    await expect(this.cropDialog).toBeHidden();
  }

  async uploadDraft(filePath: string) {
    await this.uploadFileInput.setInputFiles(filePath);
    await this.confirmCrop();
    await this.uploadButton.click();
  }

  async openItemsTab() {
    if (await this.itemsTab.isVisible()) {
      await this.itemsTab.click();
      return;
    }

    await expect(this.itemsCard).toBeVisible();
  }

  async addItemPhoto(filePath: string) {
    await this.itemPhotosInput.setInputFiles(filePath);
    await this.confirmCrop();
  }

  async addItem(name: string, quantity: string, unitPrice: string, totalPrice: string, barcode: string) {
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/api/receipts/') && response.url().includes('/items') && response.request().method() === 'POST',
    );

    await this.addItemNameInput.fill(name);
    await this.addItemQuantityInput.fill(quantity);
    await this.addItemUnitPriceInput.fill(unitPrice);
    await this.addItemTotalPriceInput.fill(totalPrice);
    await this.addItemBarcodeInput.fill(barcode);
    await this.addItemButton.click();

    const response = await responsePromise;
    if (!response.ok()) {
      throw new Error(`Failed to add receipt item: ${response.status()} ${await response.text()}`);
    }

    await this.itemName(0).waitFor({ state: 'visible', timeout: 10_000 });
  }

  itemEditButton(index: number) {
    return this.page.locator(
      `[data-testid="dashboard-receipts-items-mobile-edit-button-${index}"]:visible, [data-testid="dashboard-receipts-items-edit-button-${index}"]:visible`,
    );
  }

  itemEditNameInput(index: number) {
    return this.page.locator(
      `[data-testid="dashboard-receipts-items-mobile-edit-name-${index}"]:visible, [data-testid="dashboard-receipts-items-edit-name-${index}"]:visible`,
    );
  }

  itemEditQuantityInput(index: number) {
    return this.page.getByTestId(`dashboard-receipts-items-edit-quantity-${index}`);
  }

  itemEditUnitPriceInput(index: number) {
    return this.page.locator(
      `[data-testid="dashboard-receipts-items-mobile-edit-unit-price-${index}"]:visible, [data-testid="dashboard-receipts-items-edit-unit-price-${index}"]:visible`,
    );
  }

  itemEditTotalPriceInput(index: number) {
    return this.page.getByTestId(`dashboard-receipts-items-edit-total-price-${index}`);
  }

  itemSaveButton(index: number) {
    return this.page.locator(
      `[data-testid="dashboard-receipts-items-mobile-save-button-${index}"]:visible, [data-testid="dashboard-receipts-items-save-button-${index}"]:visible`,
    );
  }

  itemUnitPrice(index: number) {
    return this.page.locator(
      `[data-testid="dashboard-receipts-items-mobile-item-unit-price-${index}"]:visible, [data-testid="dashboard-receipts-items-item-unit-price-${index}"]:visible`,
    );
  }

  itemTotalPrice(index: number) {
    return this.page.getByTestId(`dashboard-receipts-items-item-total-price-${index}`);
  }

  itemName(index: number) {
    return this.page.locator(
      `[data-testid="dashboard-receipts-items-mobile-item-name-${index}"]:visible, [data-testid="dashboard-receipts-items-item-name-${index}"]:visible`,
    );
  }

  itemPhoto(index: number) {
    return this.page.getByTestId(`dashboard-receipts-items-file-${index}`);
  }

  itemPhotoSource(index: number) {
    return this.page.getByTestId(`dashboard-receipts-items-source-${index}`);
  }

  async getReceiptId() {
    return (await this.stateId.textContent())?.trim() ?? '';
  }

  async saveAlias(alias: string) {
    await this.aliasInput.fill(alias);
    await this.saveOcrButton.click();
  }
}
