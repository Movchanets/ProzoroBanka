import { type Page, type Locator, type Response } from '@playwright/test';
import { gotoAppPath } from '../support/navigation';

export class AdminCampaignCategoriesPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly title: Locator;
  readonly tableTitle: Locator;
  readonly nameUkInput: Locator;
  readonly nameEnInput: Locator;
  readonly slugInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('admin-campaign-categories-page');
    this.title = page.getByTestId('admin-campaign-categories-title');
    this.tableTitle = page.getByTestId('admin-campaign-categories-table-title');
    this.nameUkInput = page.getByTestId('admin-campaign-categories-name-uk-input');
    this.nameEnInput = page.getByTestId('admin-campaign-categories-name-en-input');
    this.slugInput = page.getByTestId('admin-campaign-categories-slug-input');
    this.submitButton = page.getByTestId('admin-campaign-categories-submit-button');
  }

  async goto() {
    await gotoAppPath(this.page, '/admin/campaign-categories');
  }

  getRow(slug: string) {
    return this.page.getByTestId(`admin-campaign-categories-row-${slug}`);
  }

  getDeleteButton(slug: string) {
    return this.page.getByTestId(`admin-campaign-categories-delete-${slug}`);
  }

  async fillCategory(nameUk: string, nameEn: string, slug: string) {
    await this.nameUkInput.fill(nameUk);
    await this.nameEnInput.fill(nameEn);
    await this.slugInput.fill(slug);
  }

  async submitAndWaitForCreate(): Promise<Response> {
    const createResponsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/admin/campaign-categories') &&
        response.request().method() === 'POST',
    );

    await this.submitButton.click();
    return createResponsePromise;
  }

  async deleteAndWaitForResponse(slug: string): Promise<Response> {
    const deleteResponsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/admin/campaign-categories/') &&
        response.request().method() === 'DELETE',
    );

    await this.getDeleteButton(slug).click();
    return deleteResponsePromise;
  }
}
