import { type Page, type Locator, type Response } from "@playwright/test";
export class CreateOrgDialog {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly slugInput: Locator;
  readonly descriptionInput: Locator;
  readonly websiteInput: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByTestId("create-org-name-input");
    this.slugInput = page.getByTestId("create-org-slug-input");
    this.descriptionInput = page.getByTestId("create-org-description-input");
    this.websiteInput = page.getByTestId("create-org-website-input");
    this.cancelButton = page.getByTestId("create-org-cancel-button");
    this.submitButton = page.getByTestId("create-org-submit-button");
    this.dialog = page.getByRole("dialog");
  }

  async waitForVisible() {
    await this.dialog.waitFor({ state: "visible", timeout: 5000 });
  }

  async fill(name: string, description: string, website: string) {
    await this.nameInput.fill(name);
    await this.descriptionInput.fill(description);
    await this.websiteInput.fill(website);
  }

  async submit() {
    await this.submitButton.click();
  }

  async submitAndWaitForCreate(): Promise<Response> {
    const createResponsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/organizations") &&
        response.request().method() === "POST",
    );

    await this.submit();
    return createResponsePromise;
  }

  async close() {
    await this.cancelButton.click();
  }
}
