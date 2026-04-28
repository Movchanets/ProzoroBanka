import { type Page, type Locator } from '@playwright/test';
import { gotoAppPath } from '../support/navigation';

export class PurchaseDetailPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly titleInput: Locator;
  readonly totalAmountDisplay: Locator;
  readonly saveButton: Locator;
  readonly receiptsDropzone: Locator;
  readonly waybillsDropzone: Locator;
  readonly transferDropzone: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('purchase-detail-page');
    this.titleInput = page.getByTestId('purchase-detail-title-input');
    this.totalAmountDisplay = page.getByTestId(
      'purchase-detail-total-amount-display',
    );
    this.saveButton = page.getByTestId('purchase-detail-save-button');
    this.receiptsDropzone = page.getByTestId(
      'purchase-documents-receipts-dropzone',
    );
    this.waybillsDropzone = page.getByTestId(
      'purchase-documents-waybills-dropzone',
    );
    this.transferDropzone = page.getByTestId(
      'purchase-documents-transfer-dropzone',
    );
  }

  async gotoNew(orgId: string, campaignId: string) {
    await gotoAppPath(
      this.page,
      `/dashboard/${orgId}/campaigns/${campaignId}/purchases/new`,
    );
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title);
  }

  async save() {
    await this.saveButton.click();
  }
}
