import { type Page, type Locator } from '@playwright/test';

export class CampaignPublicPage {
  readonly page: Page;
  readonly header: Locator;
  readonly progressPanel: Locator;
  readonly raisedProgress: Locator;
  readonly documentedProgress: Locator;
  readonly documentedAmount: Locator;
  readonly description: Locator;
  readonly receiptsList: Locator;
  readonly receiptLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.getByTestId('public-campaign-header');
    this.progressPanel = page.getByTestId('public-campaign-progress-panel');
    this.raisedProgress = page.getByTestId('public-campaign-progress-panel-raised-progress');
    this.documentedProgress = page.getByTestId('public-campaign-progress-panel-documented-progress');
    this.documentedAmount = page.getByTestId('public-campaign-progress-panel-documented-amount');
    this.description = page.getByTestId('public-campaign-description-text');
    this.receiptsList = page.getByTestId('public-campaign-receipts-list');
    this.receiptLink = page.locator('[data-testid^="public-campaign-receipt-link-"]');
  }

  async goto(slug: string) {
    await this.page.goto(`/c/${slug}`);
  }

  async clickFirstReceipt() {
    await this.receiptLink.first().click();
  }
}
