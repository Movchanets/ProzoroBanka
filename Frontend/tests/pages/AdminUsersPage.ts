import { type Page, type Locator } from "@playwright/test";
import { gotoAppPath } from "../support/navigation";

export class AdminUsersPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly filters: Locator;
  readonly searchInput: Locator;
  readonly refreshButton: Locator;
  readonly confirmButton: Locator;
  readonly deleteConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId("admin-users-page");
    this.filters = page.getByTestId("admin-users-filters");
    this.searchInput = page.getByTestId("admin-users-search-input");
    this.refreshButton = page.getByTestId("admin-users-refresh-button");
    this.confirmButton = page.getByTestId("admin-users-lockout-confirm");
    this.deleteConfirmButton = page.getByTestId("admin-users-delete-confirm");
  }

  async goto() {
    await gotoAppPath(this.page, "/admin/users");
  }

  getUserRow(email: string) {
    return this.page
      .locator('[data-testid^="admin-users-row-"]')
      .filter({ hasText: email })
      .first();
  }

  getStatusBadge(email: string) {
    return this.getUserRow(email)
      .locator('[data-testid^="admin-users-status-"]')
      .first();
  }

  getLockoutButton(email: string) {
    return this.getUserRow(email)
      .locator('[data-testid^="admin-users-lockout-"]')
      .first();
  }

  getImpersonateButton(email: string) {
    return this.getUserRow(email)
      .locator('[data-testid^="admin-users-impersonate-"]')
      .first();
  }

  getDeleteButton(email: string) {
    return this.getUserRow(email)
      .getByTestId(/^admin-users-delete-/);
  }

  async searchByEmail(email: string) {
    await this.searchInput.fill(email);
  }

  async refresh() {
    await this.refreshButton.click();
  }

  async toggleLockoutWithConfirmation(
    email: string,
  ) {
    const lockoutButton = this.getLockoutButton(email);
    await lockoutButton.scrollIntoViewIfNeeded();
    await lockoutButton.evaluate(el => (el as HTMLElement).click());

    // Explicitly wait for visibility to ensure the dialog is mounted
    await this.confirmButton.waitFor({ state: "attached", timeout: 15000 });
    await this.confirmButton.waitFor({ state: "visible", timeout: 15000 });
    // Add a tiny delay to ensure animations don't interfere with the click
    await this.page.waitForTimeout(500);
    
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (response) => 
          response.url().includes("/admin/users/") && 
          response.url().includes("/lockout") && 
          response.request().method() === "PUT",
        { timeout: 30000 }
      ),
      this.confirmButton.evaluate(el => (el as HTMLElement).click())
    ]);

    if (!response.ok()) {
      throw new Error(`Lockout toggle failed: ${response.status()} ${await response.text()}`);
    }
  }

  async impersonateWithConfirmation(email: string) {
    const impersonateButton = this.getImpersonateButton(email);
    await impersonateButton.scrollIntoViewIfNeeded();
    await impersonateButton.evaluate(el => (el as HTMLElement).click());

    const confirmButton = this.page.getByTestId("admin-users-impersonate-confirm");
    await confirmButton.waitFor({ state: "attached", timeout: 15000 });
    await confirmButton.waitFor({ state: "visible", timeout: 15000 });
    await this.page.waitForTimeout(500);

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (response) => 
          response.url().includes("/admin/users/") && 
          response.url().includes("/impersonate") && 
          response.request().method() === "POST",
        { timeout: 30000 }
      ),
      confirmButton.evaluate(el => (el as HTMLElement).click())
    ]);

    if (!response.ok()) {
      throw new Error(`Impersonation failed: ${response.status()} ${await response.text()}`);
    }
  }

  async deleteUserWithConfirmation(email: string) {
    const deleteButton = this.getDeleteButton(email);
    await deleteButton.scrollIntoViewIfNeeded();
    await deleteButton.evaluate(el => (el as HTMLElement).click());

    const input = this.page.getByTestId("admin-users-delete-input");
    await input.waitFor({ state: "attached", timeout: 15000 });
    await input.waitFor({ state: "visible", timeout: 15000 });
    await input.fill(email);

    await this.deleteConfirmButton.waitFor({ state: "visible", timeout: 15000 });
    await this.page.waitForTimeout(500);

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (response) => 
          response.url().includes("/admin/users/") && 
          response.request().method() === "DELETE",
        { timeout: 30000 }
      ),
      this.deleteConfirmButton.evaluate(el => (el as HTMLElement).click())
    ]);

    if (!response.ok()) {
      throw new Error(`User deletion failed: ${response.status()} ${await response.text()}`);
    }
  }
}
