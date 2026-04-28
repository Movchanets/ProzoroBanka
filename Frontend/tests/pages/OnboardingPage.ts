import { type Page, type Locator } from "@playwright/test";
import { gotoAppPath } from "../support/navigation";

export class OnboardingPage {
  readonly page: Page;
  readonly createOrgButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createOrgButton = page.getByTestId(
      "onboarding-create-organization-button",
    );
  }

  async goto() {
    await gotoAppPath(this.page, "/onboarding");
  }
}
