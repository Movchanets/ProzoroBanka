import { type Page, type Locator } from "@playwright/test";

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
  readonly publicCampaignMainTabs: Locator;
  readonly publicCampaignTabSpending: Locator;
  readonly publicCampaignPanelSpending: Locator;
  readonly publicCampaignSpendingCard: Locator;
  readonly publicCampaignSpendingList: Locator;
  readonly publicCampaignSpendingTotalBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.getByTestId("public-campaign-header");
    this.progressPanel = page.getByTestId("public-campaign-progress-panel");
    this.raisedProgress = page.getByTestId(
      "public-campaign-progress-panel-raised-progress",
    );
    this.documentedProgress = page.getByTestId(
      "public-campaign-progress-panel-documented-progress",
    );
    this.documentedAmount = page.getByTestId(
      "public-campaign-progress-panel-documented-amount",
    );
    this.description = page.getByTestId("public-campaign-description-text");
    this.receiptsList = page.getByTestId("public-campaign-receipts-list");
    this.receiptLink = page.locator(
      '[data-testid^="public-campaign-receipt-link-"]',
    );
    this.languageSwitcherTrigger = page.getByTestId(
      "language-switcher-trigger",
    );
    this.themeToggleTrigger = page.getByTestId("theme-toggle-trigger");
    this.coverOpenButton = page.getByTestId(
      "public-campaign-cover-open-button",
    );
    this.firstPostOpenButton = page.getByTestId(
      "public-campaign-post-open-button-0",
    );
    this.firstPostNextImageButton = page.getByTestId(
      "public-campaign-post-next-image-0",
    );
    this.firstPostPrevImageButton = page.getByTestId(
      "public-campaign-post-prev-image-0",
    );
    this.firstPostDot3Button = page.getByTestId("public-campaign-post-dot-0-2");
    this.galleryDialog = page.getByTestId("public-campaign-gallery-dialog");
    this.galleryCounter = page.getByTestId("public-campaign-gallery-counter");
    this.galleryNextButton = page.getByTestId(
      "public-campaign-gallery-next-button",
    );
    this.publicCampaignMainTabs = page.getByTestId("public-campaign-main-tabs");
    this.publicCampaignTabSpending = page.getByTestId(
      "public-campaign-tab-spending",
    );
    this.publicCampaignPanelSpending = page.getByTestId(
      "public-campaign-panel-spending",
    );
    this.publicCampaignSpendingCard = page.getByTestId(
      "public-campaign-spending-card",
    );
    this.publicCampaignSpendingList = page.getByTestId(
      "public-campaign-spending-list",
    );
    this.publicCampaignSpendingTotalBadge = page.getByTestId(
      "public-campaign-spending-total-badge",
    );
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

  async openSpendingTab() {
    await this.publicCampaignTabSpending.click();
  }

  getSpendingItem(index: number) {
    return this.page.getByTestId(`public-campaign-spending-item-${index}`);
  }

  getSpendingTitle(index: number) {
    return this.page.getByTestId(`public-campaign-spending-title-${index}`);
  }

  getSpendingAmount(index: number) {
    return this.page.getByTestId(`public-campaign-spending-amount-${index}`);
  }

  getSpendingDate(index: number) {
    return this.page.getByTestId(`public-campaign-spending-date-${index}`);
  }

  getSpendingDocSummary(index: number) {
    return this.page.getByTestId(
      `public-campaign-spending-doc-summary-${index}`,
    );
  }

  getSpendingCounterparty(index: number) {
    return this.page.getByTestId(
      `public-campaign-spending-counterparty-${index}`,
    );
  }

  getSpendingRestricted(index: number) {
    return this.page.getByTestId(
      `public-campaign-spending-restricted-${index}`,
    );
  }

  getSpendingDocuments(index: number) {
    return this.page.getByTestId(`public-campaign-spending-documents-${index}`);
  }

  getSpendingDocument(index: number, docIndex: number) {
    return this.page.getByTestId(
      `public-campaign-spending-document-${index}-${docIndex}`,
    );
  }

  getSpendingDocumentType(index: number, docIndex: number) {
    return this.page.getByTestId(
      `public-campaign-spending-document-type-${index}-${docIndex}`,
    );
  }

  getSpendingDocumentItemsCount(index: number, docIndex: number) {
    return this.page.getByTestId(
      `public-campaign-spending-document-items-count-${index}-${docIndex}`,
    );
  }

  getSpendingDocumentName(index: number, docIndex: number) {
    return this.page.getByTestId(
      `public-campaign-spending-document-name-${index}-${docIndex}`,
    );
  }

  getSpendingDocumentCounterparty(index: number, docIndex: number) {
    return this.page.getByTestId(
      `public-campaign-spending-document-counterparty-${index}-${docIndex}`,
    );
  }

  getSpendingDocumentDate(index: number, docIndex: number) {
    return this.page.getByTestId(
      `public-campaign-spending-document-date-${index}-${docIndex}`,
    );
  }

  getSpendingDocumentAmount(index: number, docIndex: number) {
    return this.page.getByTestId(
      `public-campaign-spending-document-amount-${index}-${docIndex}`,
    );
  }

  getSpendingDocumentOpen(index: number, docIndex: number) {
    return this.page.getByTestId(
      `public-campaign-spending-document-open-${index}-${docIndex}`,
    );
  }

  getSpendingNoVisibleDocs(index: number) {
    return this.page.getByTestId(
      `public-campaign-spending-no-visible-docs-${index}`,
    );
  }

  getSpendingOpenFull(index: number) {
    return this.page.getByTestId(`public-campaign-spending-open-full-${index}`);
  }
}
