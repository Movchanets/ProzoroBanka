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
  readonly receiptInput: Locator;
  readonly receiptUploadButton: Locator;
  readonly waybillInput: Locator;
  readonly waybillUploadButton: Locator;
  readonly successToast: Locator;
  readonly errorToast: Locator;

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
    this.receiptInput = page.getByTestId('purchase-document-receipt-input');
    this.receiptUploadButton = page.getByTestId('purchase-document-receipt-upload-button');
    this.waybillInput = page.getByTestId('purchase-document-waybill-input');
    this.waybillUploadButton = page.getByTestId('purchase-document-waybill-upload-button');
    this.successToast = page.locator('[data-sonner-toast][data-type="success"]').last();
    this.errorToast = page.locator('[data-sonner-toast][data-type="error"]').last();
  }

  async goto(orgId: string, purchaseId: string) {
    await gotoAppPath(
      this.page,
      `/dashboard/${orgId}/purchases/${purchaseId}`,
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

  async uploadReceipt(filePath: string) {
    await this.receiptInput.setInputFiles(filePath);
    await this.receiptUploadButton.click();
  }

  async uploadWaybill(filePath: string) {
    await this.waybillInput.setInputFiles(filePath);
    await this.waybillUploadButton.click();
  }

  async runOcr(docId: string) {
    await this.page.getByTestId(`purchase-document-ocr-button-${docId}`).click();
  }

  metadataForm(docId: string) {
    return this.page.getByTestId(`purchase-document-metadata-form-${docId}`);
  }

  edrpouInput(docId: string) {
    return this.page.getByTestId(`purchase-document-edrpou-input-${docId}`);
  }

  payerInput(docId: string) {
    return this.page.getByTestId(`purchase-document-payer-full-name-input-${docId}`);
  }

  amountInput(docId: string) {
    return this.page.getByTestId(`purchase-document-amount-input-${docId}`);
  }

  counterpartyInput(docId: string) {
    return this.page.getByTestId(`purchase-document-counterparty-input-${docId}`);
  }

  receiptCodeInput(docId: string) {
    return this.page.getByTestId(`purchase-document-receipt-code-input-${docId}`);
  }

  paymentPurposeInput(docId: string) {
    return this.page.getByTestId(`purchase-document-payment-purpose-input-${docId}`);
  }

  senderIbanInput(docId: string) {
    return this.page.getByTestId(`purchase-document-sender-iban-input-${docId}`);
  }

  receiverIbanInput(docId: string) {
    return this.page.getByTestId(`purchase-document-receiver-iban-input-${docId}`);
  }

  saveMetadataButton(docId: string) {
    return this.page.getByTestId(`purchase-document-save-metadata-${docId}`);
  }

  async saveMetadata(docId: string) {
    await this.saveMetadataButton(docId).click();
  }

  itemsList(docId: string) {
    return this.page.getByTestId(`purchase-document-items-list-${docId}`);
  }

  getItemRow(docId: string, index: number) {
    return this.itemsList(docId).getByTestId(/^purchase-document-item-row-/).nth(index);
  }

  getItemNameInput(itemId: string) {
    return this.page.getByTestId(`purchase-document-item-name-${itemId}`);
  }

  getItemQuantityInput(itemId: string) {
    return this.page.getByTestId(`purchase-document-item-quantity-${itemId}`);
  }

  getItemUnitPriceInput(itemId: string) {
    return this.page.getByTestId(`purchase-document-item-unit-price-${itemId}`);
  }

  getToastByText(text: string | RegExp) {
    return this.page.locator('[data-sonner-toast]').filter({ hasText: text });
  }
}
