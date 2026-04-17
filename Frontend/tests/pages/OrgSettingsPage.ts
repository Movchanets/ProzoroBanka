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
    const targetUrl = `/dashboard/${orgId}/settings`;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const isTransientFirefoxNavigationError = message.includes('NS_BINDING_ABORTED') || message.includes('NS_ERROR_FAILURE');
        if (!isTransientFirefoxNavigationError) {
          throw error;
        }
      }

      if (this.page.url().includes(`/dashboard/${orgId}/settings`)) {
        break;
      }
    }

    if (!this.page.url().includes(`/dashboard/${orgId}/settings`)) {
      throw new Error(`Unable to open organization settings for ${orgId}. Current URL: ${this.page.url()}`);
    }

    await this.nameInput.waitFor({ state: 'visible' });
  }

  async saveRegistryKeys(key: string) {
    await this.stateRegistryKeyInput.fill(key);
    await this.saveStateKeysButton.click();
  }
}
