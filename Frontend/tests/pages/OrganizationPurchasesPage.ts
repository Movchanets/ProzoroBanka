import { type Page, type Locator } from '@playwright/test';
import { gotoAppPath } from '../support/navigation';

export class OrganizationPurchasesPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly statusFilterTrigger: Locator;
  readonly openCreateDialogButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('organization-purchases-page');
    this.statusFilterTrigger = page.getByTestId(
      'organization-purchases-status-filter-trigger',
    );
    this.openCreateDialogButton = page.getByTestId(
      'organization-purchases-open-create-dialog',
    );
  }

  async goto(orgId: string, campaignId?: string) {
    const url = campaignId 
      ? `/dashboard/${orgId}/purchases?campaignId=${campaignId}`
      : `/dashboard/${orgId}/purchases`;
    await gotoAppPath(this.page, url);
  }

  async openCreatePurchase() {
    await this.openCreateDialogButton.click();
  }
}
