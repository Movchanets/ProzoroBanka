import { expect, type Locator, type Page } from '@playwright/test';

export class ReceiptsListPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly createButton: Locator;
  readonly searchInput: Locator;
  readonly refreshButton: Locator;
  readonly deleteDialog: Locator;
  readonly deleteConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('dashboard-receipts-list-page');
    this.createButton = page.getByTestId('dashboard-receipts-list-create-button');
    this.searchInput = page.getByTestId('dashboard-receipts-list-search-input');
    this.refreshButton = page.getByTestId('dashboard-receipts-list-refresh-button');
    this.deleteDialog = page.getByTestId('dashboard-receipts-list-delete-dialog');
    this.deleteConfirmButton = page.getByTestId('dashboard-receipts-list-delete-confirm');
  }

  async goto(orgId: string) {
    await this.page.goto(`/dashboard/${orgId}/receipts`);
  }

  async waitForReady() {
    await expect(this.pageContainer).toBeVisible();
  }

  row(receiptId: string) {
    return this.page.getByTestId(`dashboard-receipts-list-row-${receiptId}`);
  }

  alias(receiptId: string) {
    return this.page.getByTestId(`dashboard-receipts-list-alias-${receiptId}`);
  }

  openButton(receiptId: string) {
    return this.page.getByTestId(`dashboard-receipts-list-open-${receiptId}`);
  }

  deleteButton(receiptId: string) {
    return this.page.getByTestId(`dashboard-receipts-list-delete-${receiptId}`);
  }

  async openReceipt(receiptId: string) {
    await this.openButton(receiptId).click();
  }

  async deleteReceipt(receiptId: string) {
    await this.deleteButton(receiptId).click();
    await this.deleteConfirmButton.click();
  }
}
