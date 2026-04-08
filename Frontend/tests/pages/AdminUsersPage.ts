import { type Page, type Locator } from '@playwright/test';

export class AdminUsersPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly filters: Locator;
  readonly searchInput: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('admin-users-page');
    this.filters = page.getByTestId('admin-users-filters');
    this.searchInput = page.getByTestId('admin-users-search-input');
    this.refreshButton = page.getByTestId('admin-users-refresh-button');
  }
  
  getUserRow(email: string) {
    return this.page.locator('[data-testid^="admin-users-row-"]').filter({ hasText: email }).first();
  }
}
