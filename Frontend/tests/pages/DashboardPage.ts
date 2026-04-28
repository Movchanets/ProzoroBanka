import { type Page, type Locator } from "@playwright/test";
import { gotoAppPath } from "../support/navigation";

export class DashboardPage {
  readonly page: Page;
  readonly adminLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.adminLink = page.getByTestId("dashboard-admin-link");
  }

  async goto(orgId: string) {
    await gotoAppPath(this.page, `/dashboard/${orgId}`);
  }

  async clickAdminLink() {
    await this.adminLink.click();
  }

  getAdminNavLink(pathId: string): Locator {
    return this.page.getByTestId(`admin-nav-${pathId}`);
  }
}
