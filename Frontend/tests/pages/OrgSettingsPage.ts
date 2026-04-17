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
  readonly stateRegistryKeyInput: Locator;
  readonly saveStateKeysButton: Locator;
  readonly stateRegistryMaskedValue: Locator;

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
    this.stateRegistryKeyInput = page.getByTestId('org-settings-state-registry-key-input');
    this.saveStateKeysButton = page.getByTestId('org-settings-state-keys-save-button');
    this.stateRegistryMaskedValue = page.getByTestId('org-settings-state-registry-key-masked-value');
  }

  async goto(orgId: string) {
    await this.page.goto(`/dashboard/${orgId}/settings`);
  }

  async saveRegistryKeys(key: string) {
    await this.stateRegistryKeyInput.fill(key);
    await this.saveStateKeysButton.click();
  }
}
