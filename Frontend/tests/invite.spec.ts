import { test, expect } from '@playwright/test';
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

async function openInviteAsGuest(page: import('@playwright/test').Page, inviteToken: string): Promise<void> {
  await setTestLanguage(page);
  await page.goto(`/invite/${inviteToken}`);
  await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Finvite%2F${inviteToken}$`));
}

async function loginInviteeAndReturnToInvite(
  page: import('@playwright/test').Page,
  inviteToken: string,
  invitee: RegisteredUser,
): Promise<void> {
  await loginViaUi(page, invitee.auth.user.email, invitee.password, { gotoPath: null, setLanguage: false });
  await expect(page).toHaveURL(new RegExp(`/invite/${inviteToken}$`));
}

test.describe('Invite Flow', () => {
  test('TC-01: Guest is redirected to login with next, then after login sees invite page', async ({ page }) => {
    const { invitee, inviteToken } = await createInviteScenario(page, 'Invite');

    await openInviteAsGuest(page, inviteToken);
    await loginInviteeAndReturnToInvite(page, inviteToken, invitee);

    await expect(page.getByTestId('invite-page-card')).toBeVisible();
    await expect(page.getByTestId('invite-page-org-title')).toContainText('Invite Flow Org');
  });

  test('TC-02: Logged-in invited user can accept invitation from invite page', async ({ page }) => {
    const { invitee, inviteToken } = await createInviteScenario(page, 'Accept');

    await openInviteAsGuest(page, inviteToken);
    await loginInviteeAndReturnToInvite(page, inviteToken, invitee);

    const acceptResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/invitations/${inviteToken}/accept`) &&
        response.request().method() === 'POST',
    );

    await page.getByTestId('invite-page-accept-button').click();

    const acceptResponse = await acceptResponsePromise;
    expect(acceptResponse.ok()).toBeTruthy();

    await expect(page.getByTestId('invite-page-accepted-state')).toBeVisible();
    await expect(page.getByTestId('invite-page-go-dashboard-button')).toBeVisible();
  });

  test('TC-03: Logged-in invited user can decline invitation from invite page', async ({ page }) => {
    const { invitee, inviteToken } = await createInviteScenario(page, 'Decline');

    await openInviteAsGuest(page, inviteToken);
    await loginInviteeAndReturnToInvite(page, inviteToken, invitee);

    const declineResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/invitations/${inviteToken}/decline`) &&
        response.request().method() === 'POST',
    );

    await page.getByTestId('invite-page-decline-button').click();

    const declineResponse = await declineResponsePromise;
    expect(declineResponse.ok()).toBeTruthy();

    await expect(page.getByTestId('invite-page-declined-state')).toBeVisible();
    await expect(page.getByTestId('invite-page-go-home-button')).toBeVisible();
    await expect(page.getByText(t('invitations.page.declinedTitle'))).toBeVisible();
  });
});
