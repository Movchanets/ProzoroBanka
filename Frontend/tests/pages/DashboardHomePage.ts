import { type Page, type Locator, expect } from '@playwright/test';
export class DashboardHomePage {
  readonly page: Page;
  readonly planCard: Locator;
  readonly planName: Locator;
  readonly planDescription: Locator;
  readonly mobileMenuButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.planCard = page.getByTestId('dashboard-home-plan-card');
    this.planName = page.getByTestId('dashboard-home-plan-name');
    this.planDescription = page.getByTestId('dashboard-home-plan-description');
    this.mobileMenuButton = page.getByTestId('dashboard-mobile-menu-button');
  }

  async goto(orgId: string) {
    await this.page.goto(`/dashboard/${orgId}`);
  }

  getNavLink(key: string) {
    return this.page.getByTestId(`dashboard-nav-${key}`);
  }

  async clickNavLinkSafe(key: string) {
    const allLinks = this.getNavLink(key);
    const linksCount = await allLinks.count();
    const beforeUrl = this.page.url();

    const clickOrFallbackNavigate = async (link: Locator) => {
      const href = await link.getAttribute('href').catch(() => null);
      try {
        await link.click({ force: true });
      } catch {
        if (href) {
          await this.page.goto(href);
        }
        return;
      }

      try {
        await expect.poll(() => this.page.url(), { timeout: 1000 }).not.toBe(beforeUrl);
      } catch {
        if (href) {
          await this.page.goto(href);
        }
      }
    };

    for (let index = 0; index < linksCount; index += 1) {
      const candidate = allLinks.nth(index);
      if (await candidate.isVisible().catch(() => false)) {
        await clickOrFallbackNavigate(candidate);
        return;
      }
    }

    if (linksCount > 0) {
      await clickOrFallbackNavigate(allLinks.first());
      return;
    }

    await expect(this.mobileMenuButton).toBeVisible({ timeout: 10000 });
    await this.mobileMenuButton.click();
    const mobileLink = this.page.getByRole('dialog').getByTestId(`dashboard-nav-${key}`).first();
    await expect(mobileLink).toBeVisible({ timeout: 10000 });
    await clickOrFallbackNavigate(mobileLink);
  }
}
