import { type Page, type Locator } from '@playwright/test';
export class OnboardingPage {
  readonly page: Page;
  readonly createOrgButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createOrgButton = page.getByTestId('onboarding-create-organization-button');
  }

  async goto() {
    await this.page.goto('/onboarding');
  }
}
