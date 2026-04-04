import { type Page, type Locator } from '@playwright/test';

export class DashboardReceiptsPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly title: Locator;
  readonly uploadCard: Locator;
  readonly fileInput: Locator;
  readonly uploadButton: Locator;
  readonly actionsCard: Locator;
  readonly idInput: Locator;
  readonly extractButton: Locator;
  readonly verifyButton: Locator;
  readonly activateButton: Locator;
  readonly retryButton: Locator;
  readonly refreshButton: Locator;
  readonly stateCard: Locator;
  readonly stateEmpty: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('dashboard-receipts-page');
    this.title = page.getByTestId('dashboard-receipts-title');
    this.uploadCard = page.getByTestId('dashboard-receipts-upload-card');
    this.fileInput = page.getByTestId('dashboard-receipts-upload-file-input');
    this.uploadButton = page.getByTestId('dashboard-receipts-upload-button');
    this.actionsCard = page.getByTestId('dashboard-receipts-actions-card');
    this.idInput = page.getByTestId('dashboard-receipts-id-input');
    this.extractButton = page.getByTestId('dashboard-receipts-extract-button');
    this.verifyButton = page.getByTestId('dashboard-receipts-verify-button');
    this.activateButton = page.getByTestId('dashboard-receipts-activate-button');
    this.retryButton = page.getByTestId('dashboard-receipts-retry-button');
    this.refreshButton = page.getByTestId('dashboard-receipts-refresh-button');
    this.stateCard = page.getByTestId('dashboard-receipts-state-card');
    this.stateEmpty = page.getByTestId('dashboard-receipts-state-empty');
  }

  async goto(orgId: string) {
    await this.page.goto(`/dashboard/${orgId}/receipts`);
  }
}
