import { type Page, type Locator } from '@playwright/test';

export class PublicLayout {
  readonly page: Page;
  readonly toolbar: Locator;
  readonly toolbarEntryLink: Locator;
  readonly languageSwitcher: Locator;
  readonly themeToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toolbar = page.getByTestId('public-page-toolbar');
    this.toolbarEntryLink = page.getByTestId('public-page-toolbar-entry-link');
    this.languageSwitcher = page.getByTestId('language-switcher-trigger');
    this.themeToggle = page.getByTestId('theme-toggle-trigger');
  }
}
