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
    const btn = this.openButton(receiptId);
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ force: true });
  }

  async deleteReceipt(receiptId: string) {
    const btn = this.deleteButton(receiptId);
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ force: true });
    
    await this.deleteConfirmButton.waitFor({ state: 'visible', timeout: 10000 });

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/receipts/') &&
          resp.request().method() === 'DELETE' &&
          resp.status() >= 200 && resp.status() < 300,
        { timeout: 15000 }
      ),
      this.deleteConfirmButton.click({ force: true })
    ]);

    return response;
  }
}
