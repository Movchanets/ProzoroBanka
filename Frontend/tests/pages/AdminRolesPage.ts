import { type Page, type Locator } from '@playwright/test';

export class AdminRolesPage {
  readonly page: Page;
  readonly pageContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('admin-roles-page');
  }
}
