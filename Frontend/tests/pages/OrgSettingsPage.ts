import { type Page, type Locator } from '@playwright/test';
export class OrgSettingsPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly websiteInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly saveButton: Locator;
  readonly planPlaceholderCard: Locator;
  readonly planPlaceholderTitle: Locator;
  readonly planPlaceholderDescription: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByTestId('org-settings-name-input');
    this.descriptionInput = page.getByTestId('org-settings-description-input');
    this.websiteInput = page.getByTestId('org-settings-website-input');
    this.emailInput = page.getByTestId('org-settings-email-input');
    this.phoneInput = page.getByTestId('org-settings-phone-input');
    this.saveButton = page.getByTestId('org-settings-save-button');
    this.planPlaceholderCard = page.getByTestId('org-settings-plan-placeholder-card');
    this.planPlaceholderTitle = page.getByTestId('org-settings-plan-placeholder-title');
    this.planPlaceholderDescription = page.getByTestId('org-settings-plan-placeholder-description');
  }

  async goto(orgId: string) {
    await this.page.goto(`/dashboard/${orgId}/settings`);
  }
}
