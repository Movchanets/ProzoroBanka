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
  readonly successAlert: Locator;
  readonly stateApiKeysCard: Locator;
  readonly taxServiceKeyInput: Locator;
  readonly checkGovKeyInput: Locator;
  readonly saveStateKeysButton: Locator;
  readonly taxServiceMaskedValue: Locator;
  readonly checkGovMaskedValue: Locator;

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
    this.successAlert = page.getByTestId('org-settings-success-alert');
    this.stateApiKeysCard = page.getByTestId('org-settings-state-api-keys-card');
    this.taxServiceKeyInput = page.getByTestId('org-settings-tax-service-key-input');
    this.checkGovKeyInput = page.getByTestId('org-settings-check-gov-key-input');
    this.saveStateKeysButton = page.getByTestId('org-settings-state-keys-save-button');
    this.taxServiceMaskedValue = page.getByTestId('org-settings-tax-service-key-masked-value');
    this.checkGovMaskedValue = page.getByTestId('org-settings-check-gov-key-masked-value');
  }

  async goto(orgId: string) {
    await this.page.goto(`/dashboard/${orgId}/settings`);
  }

  async saveRegistryKeys(taxServiceKey: string, checkGovKey: string) {
    await this.taxServiceKeyInput.fill(taxServiceKey);
    await this.checkGovKeyInput.fill(checkGovKey);
    await this.saveStateKeysButton.click();
  }
}
