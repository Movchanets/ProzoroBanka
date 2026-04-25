import { type Page, type Locator } from '@playwright/test';

export class PublicLayout {
  readonly page: Page;
  readonly toolbar: Locator;
  readonly toolbarEntryLink: Locator;
  readonly toolbarCampaignsAnchor: Locator;
  readonly toolbarOrganizationsAnchor: Locator;
  readonly languageSwitcher: Locator;
  readonly themeToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    // Header / toolbar — <header> element (ARIA banner role)
    this.toolbar = page.locator('header').first();
    // Entry link — secondary-variant button linking to /login or /dashboard
    this.toolbarEntryLink = page.locator('header a[href="/login"], header a[href="/dashboard"]').first();
    // Nav anchors — links inside the header pointing to home-page hash sections
    this.toolbarCampaignsAnchor = page.locator('header a[href="/#campaigns"]');
    this.toolbarOrganizationsAnchor = page.locator('header a[href="/#organizations"]');
    this.languageSwitcher = page.getByTestId('language-switcher-trigger');
    this.themeToggle = page.getByTestId('theme-toggle-trigger');
  }
}
