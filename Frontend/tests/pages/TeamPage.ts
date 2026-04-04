import { type Page, type Locator } from '@playwright/test';

export class TeamPage {
  readonly page: Page;
  readonly openInviteDialogButton: Locator;
  readonly inviteDialog: Locator;
  readonly inviteEmailTab: Locator;
  readonly inviteLinkTab: Locator;
  readonly inviteEmailInput: Locator;
  readonly sendEmailButton: Locator;
  readonly generateLinkButton: Locator;
  readonly linkInput: Locator;
  readonly closeInviteDialogButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.openInviteDialogButton = page.getByTestId('team-open-invite-dialog-button');
    this.inviteDialog = page.getByTestId('team-invite-dialog');
    this.inviteEmailTab = page.getByTestId('team-invite-email-tab');
    this.inviteLinkTab = page.getByTestId('team-invite-link-tab');
    this.inviteEmailInput = page.getByTestId('team-invite-email-input');
    this.sendEmailButton = page.getByTestId('team-invite-send-email-button');
    this.generateLinkButton = page.getByTestId('team-invite-generate-link-button');
    this.linkInput = page.getByTestId('team-invite-link-input');
    this.closeInviteDialogButton = page.getByTestId('team-invite-close-button');
  }

  getMemberRow(email: string) {
    return this.page.getByRole('row').filter({ hasText: email });
  }
}
