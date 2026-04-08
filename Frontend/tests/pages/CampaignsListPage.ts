import { type Page, type Locator } from '@playwright/test';
export class CampaignsListPage {
  private readonly page: Page;
  readonly pageContainer: Locator;
  private readonly createButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('campaigns-list-page');
    this.createButton = page.getByTestId('campaigns-list-create-button');
  }

  async goto(orgId: string) {
    await this.page.goto(`/dashboard/${orgId}/campaigns`);
  }

  getCampaignCard(id: string): Locator {
    return this.page.getByTestId(`campaign-card-${id}`);
  }

  getCampaignTitle(title: string): Locator {
    return this.page.getByText(title, { exact: true });
  }

  async openCreateCampaign(): Promise<void> {
    await this.createButton.click();
  }

  async openCampaignDetails(campaignId: string): Promise<void> {
    await this.getCampaignCard(campaignId).click();
  }
}
