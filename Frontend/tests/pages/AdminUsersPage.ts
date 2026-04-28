import { type Page, type Locator } from "@playwright/test";
import { gotoAppPath } from "../support/navigation";

export class AdminUsersPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly filters: Locator;
  readonly searchInput: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId("admin-users-page");
    this.filters = page.getByTestId("admin-users-filters");
    this.searchInput = page.getByTestId("admin-users-search-input");
    this.refreshButton = page.getByTestId("admin-users-refresh-button");
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

  async searchByEmail(email: string) {
    await this.searchInput.fill(email);
  }

  async refresh() {
    await this.refreshButton.click();
  }

  async toggleLockoutWithConfirmation(
    email: string,
    options?: { force?: boolean },
  ) {
    await this.getLockoutButton(email).click({
      force: options?.force ?? false,
    });
    const confirmButton = this.page.getByTestId("admin-users-lockout-confirm");
    await confirmButton.click();
  }

  async impersonateWithConfirmation(email: string) {
    await this.getImpersonateButton(email).click();
    const confirmButton = this.page.getByTestId("admin-users-impersonate-confirm");
    await confirmButton.click();
  }

  async deleteUserWithConfirmation(email: string) {
    await this.getUserRow(email).getByTestId(/^admin-users-delete-/).click();
    const input = this.page.getByTestId("admin-users-delete-input");
    await input.fill(email);
    const confirmButton = this.page.getByTestId("admin-users-delete-confirm");
    await confirmButton.click();
  }
}
