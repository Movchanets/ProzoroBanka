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
  readonly languageSwitcherTrigger: Locator;
  readonly themeToggleTrigger: Locator;
  readonly coverOpenButton: Locator;
  readonly firstPostOpenButton: Locator;
  readonly firstPostNextImageButton: Locator;
  readonly firstPostPrevImageButton: Locator;
  readonly firstPostDot3Button: Locator;
  readonly galleryDialog: Locator;
  readonly galleryCounter: Locator;
  readonly galleryNextButton: Locator;

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
    this.languageSwitcherTrigger = page.getByTestId('language-switcher-trigger');
    this.themeToggleTrigger = page.getByTestId('theme-toggle-trigger');
    this.coverOpenButton = page.getByTestId('public-campaign-cover-open-button');
    this.firstPostOpenButton = page.getByTestId('public-campaign-post-open-button-0');
    this.firstPostNextImageButton = page.getByTestId('public-campaign-post-next-image-0');
    this.firstPostPrevImageButton = page.getByTestId('public-campaign-post-prev-image-0');
    this.firstPostDot3Button = page.getByTestId('public-campaign-post-dot-0-2');
    this.galleryDialog = page.getByTestId('public-campaign-gallery-dialog');
    this.galleryCounter = page.getByTestId('public-campaign-gallery-counter');
    this.galleryNextButton = page.getByTestId('public-campaign-gallery-next-button');
  }

  async goto(slug: string) {
    await this.page.goto(`/c/${slug}`);
  }

  async clickFirstReceipt() {
    await this.receiptLink.first().click();
  }

  async openThemeMenu() {
    await this.themeToggleTrigger.click();
  }

  async openCoverGallery() {
    await this.coverOpenButton.click();
  }

  async openFirstPostGallery() {
    await this.firstPostOpenButton.click();
  }
}
