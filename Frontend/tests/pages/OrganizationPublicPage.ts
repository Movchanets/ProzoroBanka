import { type Page, type Locator } from '@playwright/test';

export class OrganizationPublicPage {
  readonly page: Page;
  readonly header: Locator;
  readonly transparencyPanel: Locator;
  readonly transparencyCategoryElectronics: Locator;
  readonly transparencyCategoryLogistics: Locator;
  readonly monthlyList: Locator;
  readonly month2026_02: Locator;
  readonly month2026_03: Locator;
  readonly campaignTabs: Locator;
  readonly campaignTabActive: Locator;
  readonly campaignList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.getByTestId('public-org-header');
    this.transparencyPanel = page.getByTestId('public-org-transparency-panel');
    this.transparencyCategoryElectronics = page.getByTestId('public-org-transparency-category-електроніка');
    this.transparencyCategoryLogistics = page.getByTestId('public-org-transparency-category-логістика');
    this.monthlyList = page.getByTestId('public-org-transparency-monthly-list');
    this.month2026_02 = page.getByTestId('public-org-transparency-month-2026-02');
    this.month2026_03 = page.getByTestId('public-org-transparency-month-2026-03');
    this.campaignTabs = page.getByTestId('public-org-campaign-tabs');
    this.campaignTabActive = page.getByTestId('public-org-campaign-tab-active');
    this.campaignList = page.getByTestId('public-org-campaign-list');
  }

  async goto(slug: string) {
    await this.page.goto(`/o/${slug}`);
  }

  async clickActiveTab() {
    await this.campaignTabActive.click();
  }
}
