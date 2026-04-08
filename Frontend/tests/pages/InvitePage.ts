import { type Page, type Locator } from '@playwright/test';
export class InvitePage {
  readonly page: Page;
  readonly inviteCard: Locator;
  readonly orgTitle: Locator;
  readonly acceptButton: Locator;
  readonly declineButton: Locator;
  readonly acceptedState: Locator;
  readonly declinedState: Locator;
  readonly goDashboardButton: Locator;
  readonly goHomeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.inviteCard = page.getByTestId('invite-page-card');
    this.orgTitle = page.getByTestId('invite-page-org-title');
    this.acceptButton = page.getByTestId('invite-page-accept-button');
    this.declineButton = page.getByTestId('invite-page-decline-button');
    this.acceptedState = page.getByTestId('invite-page-accepted-state');
    this.declinedState = page.getByTestId('invite-page-declined-state');
    this.goDashboardButton = page.getByTestId('invite-page-go-dashboard-button');
    this.goHomeButton = page.getByTestId('invite-page-go-home-button');
  }

  async goto(token: string) {
    await this.page.goto(`/invite/${token}`);
  }
}
