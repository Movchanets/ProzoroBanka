import { type Page, type Locator } from '@playwright/test';

export class AdminSettingsPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly sectionPlans: Locator;
  readonly sectionGeneral: Locator;
  readonly freeMaxMembersInput: Locator;
  readonly paidMaxMembersInput: Locator;
  readonly plansSaveButton: Locator;
  readonly maxOwnedOrgsInput: Locator;
  readonly maxJoinedOrgsInput: Locator;
  readonly generalSaveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('admin-settings-page');
    this.sectionPlans = page.getByTestId('admin-settings-section-plans');
    this.sectionGeneral = page.getByTestId('admin-settings-section-general');
    this.freeMaxMembersInput = page.getByTestId('admin-settings-free-max-members-input');
    this.paidMaxMembersInput = page.getByTestId('admin-settings-paid-max-members-input');
    this.plansSaveButton = page.getByTestId('admin-settings-plans-save-button');
    this.maxOwnedOrgsInput = page.getByTestId('admin-settings-max-owned-orgs-input');
    this.maxJoinedOrgsInput = page.getByTestId('admin-settings-max-joined-orgs-input');
    this.generalSaveButton = page.getByTestId('admin-settings-general-save-button');
  }
}
