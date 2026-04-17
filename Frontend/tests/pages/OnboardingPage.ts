import { type Page, type Locator } from '@playwright/test';
export class OnboardingPage {
  readonly page: Page;
  readonly createOrgButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createOrgButton = page.getByTestId('onboarding-create-organization-button');
  }

  async goto() {
    try {
      await this.page.goto('/onboarding', { waitUntil: 'domcontentloaded' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const isTransientFirefoxNavigationError = message.includes('NS_BINDING_ABORTED') || message.includes('NS_ERROR_FAILURE');
      if (!isTransientFirefoxNavigationError) {
        throw error;
      }
    }

    await this.createOrgButton.waitFor({ state: 'visible' });
  }
}
