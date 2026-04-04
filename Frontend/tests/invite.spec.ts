import { test, expect } from './support/fixtures';
import { t, setTestLanguage } from './support/i18n';
import {
  createInviteLinkViaApi,
  createOrganizationViaApi,
  loginViaUi,
  type RegisteredUser,
  registerRandomUserViaApi,
} from './support/e2e-auth';

interface InviteScenario {
  owner: RegisteredUser;
  invitee: RegisteredUser;
  inviteToken: string;
}

async function createInviteScenario(
  page: import('@playwright/test').Page,
  flowName: 'Invite' | 'Accept' | 'Decline',
): Promise<InviteScenario> {
  const owner = await registerRandomUserViaApi(page.request, {
    firstName: 'Owner',
    lastName: flowName,
    emailPrefix: 'invite-e2e',
  });
  const invitee = await registerRandomUserViaApi(page.request, {
    firstName: 'Member',
    lastName: flowName,
    emailPrefix: 'invite-e2e',
  });

  const orgId = await createOrganizationViaApi(page.request, owner.auth.accessToken, `${flowName} Flow Org ${Date.now()}`);
  const inviteToken = await createInviteLinkViaApi(page.request, owner.auth.accessToken, orgId);

  return { owner, invitee, inviteToken };
}

test.describe('Invite Flow', () => {
  test('TC-01: Guest is redirected to login with next, then after login sees invite page', async ({ page, invitePage }) => {
    const { invitee, inviteToken } = await createInviteScenario(page, 'Invite');

    await setTestLanguage(page);
    await invitePage.goto(inviteToken);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Finvite%2F${inviteToken}$`));

    await loginViaUi(page, invitee.auth.user.email, invitee.password, {
      gotoPath: null,
      setLanguage: false,
    });

    await expect(page).toHaveURL(new RegExp(`/invite/${inviteToken}$`));
    await expect(invitePage.inviteCard).toBeVisible();
    await expect(invitePage.orgTitle).toContainText('Invite Flow Org');
  });

  test('TC-02: Logged-in invited user can accept invitation from invite page', async ({ page, invitePage }) => {
    const { invitee, inviteToken } = await createInviteScenario(page, 'Accept');

    await setTestLanguage(page);
    await invitePage.goto(inviteToken);
    await loginViaUi(page, invitee.auth.user.email, invitee.password, {
      gotoPath: null,
      setLanguage: false,
    });
    await expect(page).toHaveURL(new RegExp(`/invite/${inviteToken}$`));

    const acceptResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/invitations/${inviteToken}/accept`) &&
        response.request().method() === 'POST',
    );

    await invitePage.acceptButton.click();

    const acceptResponse = await acceptResponsePromise;
    expect(acceptResponse.ok()).toBeTruthy();

    await expect(invitePage.acceptedState).toBeVisible();
    await expect(invitePage.goDashboardButton).toBeVisible();
  });

  test('TC-03: Logged-in invited user can decline invitation from invite page', async ({ page, invitePage }) => {
    const { invitee, inviteToken } = await createInviteScenario(page, 'Decline');

    await setTestLanguage(page);
    await invitePage.goto(inviteToken);
    await loginViaUi(page, invitee.auth.user.email, invitee.password, {
      gotoPath: null,
      setLanguage: false,
    });
    await expect(page).toHaveURL(new RegExp(`/invite/${inviteToken}$`));

    const declineResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/invitations/${inviteToken}/decline`) &&
        response.request().method() === 'POST',
    );

    await invitePage.declineButton.click();

    const declineResponse = await declineResponsePromise;
    expect(declineResponse.ok()).toBeTruthy();

    await expect(invitePage.declinedState).toBeVisible();
    await expect(invitePage.goHomeButton).toBeVisible();
    await expect(page.getByText(t('invitations.page.declinedTitle'))).toBeVisible();
  });
});
