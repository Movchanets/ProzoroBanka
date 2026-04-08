import { expect, type Locator, type Page } from '@playwright/test';

export class ReceiptDetailPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly title: Locator;
  readonly uploadFileInput: Locator;
  readonly uploadButton: Locator;
  readonly uploadPreview: Locator;
  readonly itemsTab: Locator;
  readonly itemPhotosInput: Locator;
  readonly itemPhotosList: Locator;
  readonly aliasInput: Locator;
  readonly saveOcrButton: Locator;
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
    this.itemsTab = page.getByTestId('dashboard-receipts-upload-tab-items');
    this.itemPhotosInput = page.getByTestId('dashboard-receipts-items-files-input');
    this.itemPhotosList = page.getByTestId('dashboard-receipts-items-files-list');
    this.aliasInput = page.getByTestId('dashboard-receipts-alias-input');
    this.saveOcrButton = page.getByTestId('dashboard-receipts-save-ocr-button');
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
    await this.itemsTab.click();
  }

  async addItemPhoto(filePath: string) {
    await this.itemPhotosInput.setInputFiles(filePath);
    await this.confirmCrop();
    await this.itemPhotosList.waitFor({ state: 'visible', timeout: 10_000 });
    await this.itemPhoto(0).waitFor({ state: 'visible', timeout: 10_000 });
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
