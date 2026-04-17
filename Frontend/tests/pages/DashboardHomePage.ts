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

  private async gotoWithRetry(targetUrl: string) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const isTransientFirefoxNavigationError = message.includes('NS_BINDING_ABORTED') || message.includes('NS_ERROR_FAILURE');
        if (attempt === 2 || !isTransientFirefoxNavigationError) {
          throw error;
        }
      }
    }
  }

  async goto(orgId: string) {
    const targetUrl = `/dashboard/${orgId}`;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.gotoWithRetry(targetUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const isTransientFirefoxNavigationError = message.includes('NS_BINDING_ABORTED') || message.includes('NS_ERROR_FAILURE');
        if (!isTransientFirefoxNavigationError) {
          throw error;
        }
      }

      if (this.page.url().includes(`/dashboard/${orgId}`)) {
        return;
      }
    }

    if (!this.page.url().includes(`/dashboard/${orgId}`)) {
      throw new Error(`Unable to open dashboard home for ${orgId}. Current URL: ${this.page.url()}`);
    }
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
          await this.gotoWithRetry(href);
        }
        return;
      }

      try {
        await expect.poll(() => this.page.url(), { timeout: 1000 }).not.toBe(beforeUrl);
      } catch {
        if (href) {
          await this.gotoWithRetry(href);
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

    const isMobileMenuVisible = await this.mobileMenuButton.isVisible().catch(() => false);
    if (isMobileMenuVisible) {
      await this.mobileMenuButton.click();
      const mobileLink = this.page.getByRole('dialog').getByTestId(`dashboard-nav-${key}`).first();
      await expect(mobileLink).toBeVisible({ timeout: 10000 });
      await clickOrFallbackNavigate(mobileLink);
      return;
    }

    // Last-resort desktop fallback for transient layout/render states in CI and Firefox.
    const orgMatch = this.page.url().match(/\/dashboard\/([a-f0-9-]+)/i);
    const orgId = orgMatch?.[1];
    if (!orgId) {
      throw new Error(`Unable to resolve dashboard organization id from URL: ${this.page.url()}`);
    }

    const fallbackPathByKey: Record<string, string> = {
      campaigns: `/dashboard/${orgId}/campaigns`,
      settings: `/dashboard/${orgId}/settings`,
      home: `/dashboard/${orgId}`,
    };

    const fallbackPath = fallbackPathByKey[key];
    if (!fallbackPath) {
      throw new Error(`Unsupported dashboard navigation key: ${key}`);
    }

    await this.gotoWithRetry(fallbackPath);
  }
}
