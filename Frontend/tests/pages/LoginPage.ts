import { type Page, type Locator, type Response } from "@playwright/test";
import { gotoAppPath } from "../support/navigation";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly publicPagesLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.submitButton = page.getByTestId("login-submit-button");
    this.errorAlert = page.getByTestId("login-error-alert");
    this.publicPagesLink = page.getByTestId("login-public-pages-link");
  }

  async goto() {
    await gotoAppPath(this.page, "/login");
  }

  getHeading(title: string) {
    return this.page.getByRole("heading", { name: title });
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async submitAndWaitForLoginResponse(): Promise<Response> {
    const loginResponsePromise = this.waitForLoginResponse();
    await this.submit();
    return loginResponsePromise;
  }

  getValidationMessage(message: string) {
    return this.page.getByText(message);
  }

  waitForLoginResponse() {
    return this.page.waitForResponse(
      (response) =>
        response.url().includes("/auth/login") &&
        response.request().method() === "POST",
    );
  }
}
