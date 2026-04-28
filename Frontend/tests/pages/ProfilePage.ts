import { type Page, type Locator } from "@playwright/test";
import { gotoAppPath } from "../support/navigation";

export class ProfilePage {
  readonly page: Page;
  readonly appShellAdminLink: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly phoneInput: Locator;
  readonly saveButton: Locator;
  readonly avatarUpdateButton: Locator;
  readonly tabInvitations: Locator;
  readonly tabContentInvitations: Locator;
  readonly goOnboardingButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.appShellAdminLink = page.getByTestId("app-shell-admin-link");
    this.firstNameInput = page.getByTestId("profile-first-name-input");
    this.lastNameInput = page.getByTestId("profile-last-name-input");
    this.phoneInput = page.getByTestId("profile-phone-input");
    this.saveButton = page.getByTestId("profile-save-button");
    this.avatarUpdateButton = page.getByTestId("profile-avatar-update-button");
    this.tabInvitations = page.getByTestId("profile-tab-invitations");
    this.tabContentInvitations = page.getByTestId(
      "profile-tab-content-invitations",
    );
    this.goOnboardingButton = page.getByTestId("profile-go-onboarding-button");
  }

  async goto() {
    await gotoAppPath(this.page, "/profile");
  }

  getIncomingInvitationRow(idOrPattern: string | RegExp) {
    if (typeof idOrPattern === "string") {
      return this.page.getByTestId(
        `profile-incoming-invitation-row-${idOrPattern}`,
      );
    }
    return this.page.getByTestId(idOrPattern);
  }

  getIncomingInvitationAcceptButton(idOrPattern: string | RegExp) {
    return this.getIncomingInvitationRow(idOrPattern).locator(
      '[data-testid^="profile-incoming-invitation-accept-"]',
    );
  }

  getIncomingInvitationDeclineButton(idOrPattern: string | RegExp) {
    return this.getIncomingInvitationRow(idOrPattern).locator(
      '[data-testid^="profile-incoming-invitation-decline-"]',
    );
  }

  getSentInvitationRow(idOrPattern: string | RegExp) {
    if (typeof idOrPattern === "string") {
      return this.page.getByTestId(
        `profile-sent-invitation-row-${idOrPattern}`,
      );
    }
    return this.page.getByTestId(idOrPattern);
  }

  getSentInvitationCancelButton(idOrPattern: string | RegExp) {
    return this.getSentInvitationRow(idOrPattern).locator(
      '[data-testid^="profile-sent-invitation-cancel-"]',
    );
  }
}
