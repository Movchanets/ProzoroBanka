import { type Page, type Locator } from '@playwright/test';

export class AdminOrganizationsPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly searchInput: Locator;
  readonly filterAll: Locator;
  readonly filterUnverified: Locator;
  readonly planPanel: Locator;
  readonly usageCampaigns: Locator;
  readonly usageMembersValue: Locator;
  readonly planPaidButton: Locator;
  readonly planApplyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('admin-organizations-page');
    this.searchInput = page.getByTestId('admin-organizations-search-input');
    this.filterAll = page.getByTestId('admin-organizations-filter-all');
    this.filterUnverified = page.getByTestId('admin-organizations-filter-unverified');
    this.planPanel = page.getByTestId('admin-organizations-plan-panel');
    this.usageCampaigns = page.getByTestId('admin-organizations-usage-campaigns');
    this.usageMembersValue = page.getByTestId('admin-organizations-usage-members-value');
    this.planPaidButton = page.getByTestId('admin-organizations-plan-paid-button');
    this.planApplyButton = page.getByTestId('admin-organizations-plan-apply-button');
  }

  getOrgRow(orgId: string) {
    return this.page.getByTestId(`admin-organizations-row-${orgId}`);
  }

  getOrgUnverifiedBadge(orgId: string) {
    return this.page.getByTestId(`admin-organizations-unverified-${orgId}`);
  }

  getSelectOrgButton(orgId: string) {
    return this.page.getByTestId(`admin-organizations-select-${orgId}`);
  }

  getOrgPlanLabel(orgId: string) {
    return this.page.getByTestId(`admin-organizations-plan-${orgId}`);
  }
}
