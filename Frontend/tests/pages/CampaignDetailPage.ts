import { type Page, type Locator } from '@playwright/test';
export class CampaignDetailPage {
  private readonly page: Page;
  readonly pageContainer: Locator;
  readonly title: Locator;
  readonly statusBadge: Locator;
  private readonly editButton: Locator;
  readonly raisedProgress: Locator;
  readonly documentedProgress: Locator;
  readonly documentedAmount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('campaign-detail-page');
    this.title = page.getByTestId('campaign-detail-title');
    this.statusBadge = page.getByTestId('campaign-detail-status-badge');
    this.editButton = page.getByTestId('campaign-detail-edit-button');
    this.raisedProgress = page.getByTestId('campaign-detail-progress-raised-progress');
    this.documentedProgress = page.getByTestId('campaign-detail-progress-documented-progress');
    this.documentedAmount = page.getByTestId('campaign-detail-progress-documented-amount');
  }

  async goto(orgId: string, campaignId: string): Promise<void> {
    await this.page.goto(`/dashboard/${orgId}/campaigns/${campaignId}`);
  }

  async openEdit(): Promise<void> {
    await this.editButton.click();
  }
}
