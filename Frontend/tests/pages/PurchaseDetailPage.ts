import { expect, type Page, type Locator } from '@playwright/test';
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
  readonly openAttachDialogButton: Locator;
  readonly attachCampaignSelect: Locator;
  readonly attachSaveButton: Locator;
  readonly draftAttachCard: Locator;

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
    this.openAttachDialogButton = page.getByTestId('purchase-detail-open-attach-campaign-dialog');
    this.attachCampaignSelect = page.getByTestId('purchase-attach-campaign-select');
    this.attachSaveButton = page.getByTestId('purchase-attach-save-button');
    this.draftAttachCard = page.getByTestId('purchase-detail-draft-attach-card');
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

  async uploadReceipt(orgId: string, purchaseId: string, filePath: string): Promise<string> {
    await this.receiptInput.waitFor({ state: 'attached' });
    // Ensure input is not disabled (happens if page hasn't fully transitioned from 'new')
    await expect(this.receiptInput).toBeEnabled({ timeout: 10000 });
    
    await this.receiptInput.setInputFiles(filePath);
    // Force a change event to ensure React state updates in flaky browsers
    await this.receiptInput.evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true })));
    
    await expect(this.receiptUploadButton).toBeEnabled({ timeout: 15000 });

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes(`/purchases/`) && resp.url().includes(`/documents`) &&
          resp.request().method() === "POST" &&
          resp.status() >= 200 && resp.status() < 300,
        { timeout: 30000 },
      ),
      this.receiptUploadButton.evaluate(el => (el as HTMLElement).click()),
    ]);

    if (!response.ok()) {
      throw new Error(`Upload failed: ${response.status()} ${await response.text()}`);
    }

    const body = await response.json();
    // Support both direct DTO and ServiceResponse wrapped Payload
    const docId = body.id || body.Id || (body.payload && (body.payload.id || body.payload.Id));

    if (!docId) {
      throw new Error(`Document upload response missing ID. Body keys: ${Object.keys(body).join(", ")}`);
    }

    return docId;
  }

  async uploadWaybill(orgId: string, purchaseId: string, filePath: string): Promise<string> {
    await this.waybillInput.waitFor({ state: 'attached' });
    // Ensure input is not disabled
    await expect(this.waybillInput).toBeEnabled({ timeout: 10000 });

    await this.waybillInput.setInputFiles(filePath);
    // Force a change event to ensure React state updates
    await this.waybillInput.evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true })));

    await expect(this.waybillUploadButton).toBeEnabled({ timeout: 15000 });

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes(`/purchases/`) && resp.url().includes(`/documents`) &&
          resp.request().method() === "POST" &&
          resp.status() >= 200 && resp.status() < 300,
        { timeout: 30000 },
      ),
      this.waybillUploadButton.evaluate(el => (el as HTMLElement).click()),
    ]);

    if (!response.ok()) {
      throw new Error(`Upload failed: ${response.status()} ${await response.text()}`);
    }

    const body = await response.json();
    const docId = body.id || body.Id || (body.payload && (body.payload.id || body.payload.Id));

    if (!docId) {
      throw new Error(`Document upload response missing ID. Body keys: ${Object.keys(body).join(", ")}`);
    }

    return docId;
  }

  async runOcr(docId: string) {
    const ocrButton = this.ocrButton(docId);
    await ocrButton.waitFor({ state: 'attached' });
    await expect(ocrButton).toBeEnabled();

    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/ocr') &&
          resp.request().method() === 'POST' &&
          resp.status() >= 200 && resp.status() < 300,
        { timeout: 30000 }
      ),
      ocrButton.click({ force: true })
    ]);
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
    const saveButton = this.saveMetadataButton(docId);
    await saveButton.waitFor({ state: 'attached' });
    await expect(saveButton).toBeEnabled();

    console.log(`[POM] Saving metadata for docId: ${docId}`);
    const responsePromise = this.page.waitForResponse(
      (resp) => {
        const matches = resp.url().includes(`/documents/${docId}/metadata`) && resp.request().method() === 'PATCH';
        return matches;
      },
      { timeout: 45000 }
    );
    console.log(`[POM] Triggering click on save button for docId: ${docId}`);
    await saveButton.evaluate(el => (el as HTMLElement).click());
    const response = await responsePromise;
    console.log(`[POM] Metadata save response received: ${response.status()}`);

    // Wait for the success toast to ensure UI has processed the save
    await expect(this.getToastByText(/оновлено|Saved/i)).toBeVisible({ timeout: 15000 });
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

  get totalPurchaseAmountText() {
    return this.totalAmountDisplay;
  }

  getToastByText(text: string | RegExp) {
    return this.page.locator('[data-sonner-toast]').filter({ hasText: text });
  }

  async getUploadedDocumentId(type: 'Receipt' | 'Waybill' | 'Transfer') {
    const block = this.getDocumentBlock(type);
    const row = block.locator('[data-testid^="document-row-"]').first();
    await row.waitFor({ state: 'attached' });
    const testId = await row.getAttribute('data-testid');
    console.log(`[POM] Found document row with testId: ${testId}`);
    if (!testId) throw new Error(`Could not find document row for type ${type}`);
    const docId = testId.split('document-row-')[1];
    console.log(`[POM] Extracted docId: ${docId}`);
    return docId;
  }

  async getDocIdByName(name: string): Promise<string | null> {
    const docHeader = this.page.locator('span').filter({ hasText: name }).first();
    const docCard = docHeader.locator('xpath=ancestor::div[contains(@class, "border")][1]');
    const ocrButton = docCard.getByTestId(/^purchase-document-ocr-button-/);
    const testId = await ocrButton.getAttribute('data-testid');
    return testId?.replace('purchase-document-ocr-button-', '') || null;
  }

  ocrButton(docId: string) {
    return this.page.getByTestId(`purchase-document-ocr-button-${docId}`);
  }

  async attachToCampaign(campaignTitle: string) {
    await this.openAttachDialogButton.waitFor({ state: 'attached' });
    await this.openAttachDialogButton.click({ force: true });
    
    await this.attachCampaignSelect.waitFor({ state: 'attached' });
    await this.attachCampaignSelect.click({ force: true });
    
    await this.page.getByRole('option', { name: campaignTitle }).click();
    
    await this.attachSaveButton.waitFor({ state: 'attached' });
    await expect(this.attachSaveButton).toBeEnabled();

    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/attach') &&
          resp.request().method() === 'POST' &&
          resp.status() >= 200 && resp.status() < 300,
        { timeout: 15000 }
      ),
      this.attachSaveButton.click({ force: true })
    ]);
  }

  getDocumentBlock(type: 'Receipt' | 'Waybill' | 'Transfer') {
    const testId = type === 'Receipt' 
      ? 'purchase-documents-receipts-block' 
      : type === 'Waybill' 
        ? 'purchase-documents-waybills-block' 
        : 'purchase-documents-transfer-block';
    return this.page.getByTestId(testId);
  }
}
