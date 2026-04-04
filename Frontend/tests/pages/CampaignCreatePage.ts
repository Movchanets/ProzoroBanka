import { type APIResponse, type Locator, type Page } from '@playwright/test';
export class CampaignCreatePage {
  private readonly page: Page;
  readonly pageContainer: Locator;
  private readonly titleInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly goalInput: Locator;
  private readonly deadlineInput: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('campaign-create-page');
    this.titleInput = page.getByTestId('campaign-create-title-input');
    this.descriptionInput = page.getByTestId('campaign-create-description-input');
    this.goalInput = page.getByTestId('campaign-create-goal-input');
    this.deadlineInput = page.getByTestId('campaign-create-deadline-input');
    this.submitButton = page.getByTestId('campaign-create-submit-button');
  }

  async fillForm(payload: {
    title: string;
    description: string;
    goalAmount: string;
    deadline: string;
  }): Promise<void> {
    await this.titleInput.fill(payload.title);
    await this.descriptionInput.fill(payload.description);
    await this.goalInput.fill(payload.goalAmount);
    await this.deadlineInput.fill(payload.deadline);
  }

  async submitAndWaitForCreate(orgId: string): Promise<APIResponse> {
    const createResponsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes(`/api/organizations/${orgId}/campaigns`) &&
        response.request().method() === 'POST',
    );

    await this.submitButton.click();
    return createResponsePromise;
  }
}
