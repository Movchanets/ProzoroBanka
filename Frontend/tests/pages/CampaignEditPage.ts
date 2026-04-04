import { type APIResponse, type Locator, type Page } from '@playwright/test';
export class CampaignEditPage {
  private readonly page: Page;
  readonly pageContainer: Locator;
  private readonly titleInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly saveButton: Locator;
  readonly successAlert: Locator;
  private readonly statusTrigger: Locator;
  private readonly openMonobankWizardButton: Locator;
  readonly monobankWizardDialog: Locator;
  readonly monobankTokenInput: Locator;
  readonly monobankFetchJarsButton: Locator;
  readonly monobankConnectButton: Locator;
  private readonly monobankCancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('campaign-edit-page');
    this.titleInput = page.getByTestId('campaign-edit-title-input');
    this.descriptionInput = page.getByTestId('campaign-edit-description-input');
    this.saveButton = page.getByTestId('campaign-edit-save-button');
    this.successAlert = page.getByTestId('campaign-edit-success-alert');
    this.statusTrigger = page.getByTestId('campaign-edit-status-trigger');

    this.openMonobankWizardButton = page.getByTestId('campaign-edit-open-monobank-wizard-button');
    this.monobankWizardDialog = page.getByTestId('campaign-edit-monobank-wizard-dialog');
    this.monobankTokenInput = page.getByTestId('campaign-edit-monobank-token-input');
    this.monobankFetchJarsButton = page.getByTestId('campaign-edit-monobank-fetch-jars-button');
    this.monobankConnectButton = page.getByTestId('campaign-edit-monobank-connect-button');
    this.monobankCancelButton = page.getByTestId('campaign-edit-monobank-cancel-button');
  }

  getStatusOption(id: string): Locator {
    return this.page.getByTestId(id);
  }

  getTitleInput(): Locator {
    return this.titleInput;
  }

  async goto(orgId: string, campaignId: string): Promise<void> {
    await this.page.goto(`/dashboard/${orgId}/campaigns/${campaignId}/edit`);
  }

  async fillMainDetails(title: string, description: string): Promise<void> {
    await this.titleInput.fill(title);
    await this.descriptionInput.fill(description);
  }

  async saveAndWaitForUpdate(campaignId: string): Promise<APIResponse> {
    const updateResponsePromise = this.page.waitForResponse(
      (response) => response.url().includes(`/api/campaigns/${campaignId}`) && response.request().method() === 'PUT',
    );

    await this.saveButton.click();
    return updateResponsePromise;
  }

  async changeStatusAndWaitForUpdate(campaignId: string, optionTestId: string): Promise<APIResponse> {
    const statusResponsePromise = this.page.waitForResponse(
      (response) => response.url().includes(`/api/campaigns/${campaignId}/status`) && response.request().method() === 'PUT',
    );

    await this.statusTrigger.click();
    await this.getStatusOption(optionTestId).click();
    return statusResponsePromise;
  }

  async openMonobankWizard(): Promise<void> {
    await this.openMonobankWizardButton.click();
  }

  async closeMonobankWizard(): Promise<void> {
    await this.monobankCancelButton.click();
  }
}
