import { type Page, type Locator } from '@playwright/test';

export class ReceiptPublicPage {
  readonly page: Page;
  readonly receiptPage: Locator;
  readonly image: Locator;
  readonly structuredOutput: Locator;
  readonly validationFields: Locator;

  constructor(page: Page) {
    this.page = page;
    this.receiptPage = page.getByTestId('public-receipt-page');
    this.image = page.getByTestId('public-receipt-image');
    this.structuredOutput = page.getByTestId('public-receipt-structured-output');
    this.validationFields = page.getByTestId('public-receipt-validation-fields');
  }

  async goto(id: string) {
    await this.page.goto(`/receipt/${id}`);
  }
}
