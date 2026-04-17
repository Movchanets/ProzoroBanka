import { type Page, type Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly adminLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.adminLink = page.getByTestId('dashboard-admin-link');
  }

  async goto(orgId: string) {
    const targetUrl = `/dashboard/${orgId}`;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const isTransientFirefoxNavigationError = message.includes('NS_BINDING_ABORTED') || message.includes('NS_ERROR_FAILURE');
        if (!isTransientFirefoxNavigationError) {
          throw error;
        }
      }

      if (this.page.url().includes(`/dashboard/${orgId}`)) {
        await this.adminLink.waitFor({ state: 'visible' });
        return;
      }
    }

    throw new Error(`Unable to open dashboard for ${orgId}. Current URL: ${this.page.url()}`);
  }

  async clickAdminLink() {
    await this.adminLink.click();
  }

  getAdminNavLink(pathId: string): Locator {
    return this.page.getByTestId(`admin-nav-${pathId}`);
  }
}
