import { type Page, type Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly mainHeading: Locator;
  readonly heroSection: Locator;
  readonly mainTabs: Locator;
  readonly searchForm: Locator;
  readonly searchInput: Locator;
  readonly searchSubmitButton: Locator;
  readonly campaignGrid: Locator;
  readonly campaignCardLink: Locator;
  readonly campaignOrgLink: Locator;
  readonly verifiedOrgToggle: Locator;
  readonly campaignStatusSelect: Locator;
  readonly campaignCategorySelect: Locator;
  readonly tabOrganizations: Locator;
  readonly orgGrid: Locator;
  readonly verifiedFilterToggle: Locator;
  readonly activeFilterToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mainHeading = page.getByRole('heading', { level: 1 });
    this.heroSection = page.getByTestId('home-hero-section');
    this.mainTabs = page.getByTestId('home-main-tabs');
    this.searchForm = page.getByTestId('home-search-form');
    this.searchInput = page.getByTestId('home-search-input');
    this.searchSubmitButton = page.getByTestId('home-search-submit-button');
    this.campaignGrid = page.getByTestId('home-campaign-grid');
    this.campaignCardLink = page.getByTestId('home-campaign-card-link');
    this.campaignOrgLink = page.getByTestId('home-campaign-org-link');
    this.verifiedOrgToggle = page.getByTestId('home-campaign-verified-org-toggle');
    this.campaignStatusSelect = page.getByTestId('home-campaign-status-select');
    this.campaignCategorySelect = page.getByTestId('home-campaign-category-select');
    this.tabOrganizations = page.getByTestId('home-main-tab-organizations');
    this.orgGrid = page.getByTestId('home-org-grid');
    this.verifiedFilterToggle = page.getByTestId('home-verified-filter-toggle');
    this.activeFilterToggle = page.getByTestId('home-active-filter-toggle');
  }

  async goto() {
    await this.page.goto('/');
  }

  async fillSearch(text: string) {
    await this.searchInput.fill(text);
  }

  async toggleVerifiedOrg(check: boolean) {
    if (check) await this.verifiedOrgToggle.check();
    else await this.verifiedOrgToggle.uncheck();
  }

  async selectStatus(nameRegex: RegExp) {
    await this.campaignStatusSelect.click();
    await this.page.getByRole('option', { name: nameRegex }).click();
  }

  async selectCategory(nameRegex: RegExp) {
    await this.campaignCategorySelect.click();
    await this.page.getByRole('option', { name: nameRegex }).click();
  }

  async submitSearchAndWait() {
    await Promise.all([
      this.page.waitForResponse((response) =>
        response.url().includes('/api/public/campaigns/search') && response.ok(),
      ),
      this.searchSubmitButton.click(),
    ]);
  }

  async clickOrganizationsTab() {
    await this.tabOrganizations.click();
  }
}
