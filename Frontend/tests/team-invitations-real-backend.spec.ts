import { test, expect } from './support/fixtures';

import { setTestLanguage } from './support/i18n';
import {
  createEmailInviteViaApi,
  createOrganizationViaApi,
  registerAndSetAuthStorage,
  registerRandomUserViaApi,
  setAuthStorage,
} from './support/e2e-auth';

test.describe.configure({ timeout: 90_000 });

test.describe('Team Invitations — Real Backend', () => {
  test.beforeEach(async ({ page }) => {
    await setTestLanguage(page, 'uk');
  });

  test('TC-01: Owner sends email invite, invitee accepts in profile, owner changes role in Team actions', async ({ page, teamPage, profilePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Real backend flow: create owner/invitee users, create org, send email invite, onboarding->profile transition, accept in profile, back to onboarding/dashboard, verify and change role in Team actions.',
    });

    const owner = await registerAndSetAuthStorage(page, {
      firstName: 'Owner',
      lastName: 'E2E',
      emailPrefix: 'e2e-invite',
    });
    const invitee = await registerRandomUserViaApi(page.request, {
      firstName: 'Invitee',
      lastName: 'E2E',
      emailPrefix: 'e2e-invite',
    });

    const orgId = await createOrganizationViaApi(page.request, owner.auth.accessToken, `Invite Org ${Date.now()}`);

    await page.goto(`/dashboard/${orgId}/team`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${orgId}/team$`));

    await teamPage.openInviteDialogButton.click();
    await expect(teamPage.inviteDialog).toBeVisible();

    await teamPage.inviteEmailTab.click();
    await teamPage.inviteEmailInput.fill(invitee.auth.user.email);

    const inviteResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/organizations/${orgId}/invites/email`) &&
        response.request().method() === 'POST',
    );

    await teamPage.sendEmailButton.click();
    const inviteResponse = await inviteResponsePromise;
    expect(inviteResponse.ok()).toBeTruthy();

    await teamPage.closeInviteDialogButton.click();

    await setAuthStorage(page, invitee.auth);
    // onboardingPage goto is not using url logic so use normal goto
    await page.goto('/onboarding');
    await expect(page.getByTestId('onboarding-go-profile-button')).toBeVisible();
    await page.getByTestId('onboarding-go-profile-button').click();
    await expect(page).toHaveURL(/\/profile$/);

    await profilePage.tabInvitations.click();
    await expect(profilePage.tabContentInvitations).toBeVisible();

    const incomingInvitationRow = profilePage.getIncomingInvitationRow(/./).first();
    await expect(incomingInvitationRow).toBeVisible({ timeout: 10_000 });

    const acceptResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/invitations/') &&
        response.url().includes('/accept') &&
        response.request().method() === 'POST',
    );

    await profilePage.getIncomingInvitationAcceptButton(/./).first().click();
    const acceptResponse = await acceptResponsePromise;
    expect(acceptResponse.ok()).toBeTruthy();

    await profilePage.goOnboardingButton.click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/${orgId}`));

    await setAuthStorage(page, owner.auth);
    await page.goto(`/dashboard/${orgId}/team`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${orgId}/team$`));

    const inviteeRow = teamPage.getMemberRow(invitee.auth.user.email);
    await expect(inviteeRow).toBeVisible({ timeout: 10_000 });

    const roleSelectTrigger = inviteeRow.locator('[data-testid^="team-member-role-select-"]');
    await expect(roleSelectTrigger).toBeVisible();

    const changeRoleResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/organizations/${orgId}/members/`) &&
        response.request().method() === 'PUT',
    );

    await roleSelectTrigger.click();
    await page.getByRole('option', { name: /Адмін|Admin/i }).click();

    const changedRoleResponse = await changeRoleResponsePromise;
    expect(changedRoleResponse.ok()).toBeTruthy();

    await expect(inviteeRow).toContainText(/Адмін|Admin/i);
  });

  test('TC-02: Invite link tab generates a valid link on real backend', async ({ page, teamPage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Real backend flow: owner opens invite dialog, generates link invite, verifies API success and generated invite URL visibility.',
    });

    const owner = await registerAndSetAuthStorage(page, {
      firstName: 'Owner',
      lastName: 'LinkInvite',
      emailPrefix: 'e2e-invite',
    });
    const orgId = await createOrganizationViaApi(page.request, owner.auth.accessToken, `Invite Link Org ${Date.now()}`);

    await page.goto(`/dashboard/${orgId}/team`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${orgId}/team$`));

    await teamPage.openInviteDialogButton.click();
    await expect(teamPage.inviteDialog).toBeVisible();
    await teamPage.inviteLinkTab.click();

    const createLinkResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/organizations/${orgId}/invites/link`) &&
        response.request().method() === 'POST',
    );

    await teamPage.generateLinkButton.click();
    const createLinkResponse = await createLinkResponsePromise;
    expect(createLinkResponse.ok()).toBeTruthy();

    await expect(teamPage.linkInput).toBeVisible();
    await expect(teamPage.linkInput).toHaveValue(new RegExp('/invite/.+'));
  });

  test('TC-03: Invitee declines incoming invitation in profile tab on real backend', async ({ page, profilePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Real backend flow: owner creates email invite, invitee opens profile invitations tab, declines invite and verifies it no longer appears as incoming pending.',
    });

    const owner = await registerAndSetAuthStorage(page, {
      firstName: 'Owner',
      lastName: 'DeclineFlow',
      emailPrefix: 'e2e-invite',
    });
    const invitee = await registerRandomUserViaApi(page.request, {
      firstName: 'Invitee',
      lastName: 'DeclineFlow',
      emailPrefix: 'e2e-invite',
    });

    const orgId = await createOrganizationViaApi(page.request, owner.auth.accessToken, `Invite Decline Org ${Date.now()}`);
    await createEmailInviteViaApi(page.request, owner.auth.accessToken, orgId, invitee.auth.user.email, 2);

    await setAuthStorage(page, invitee.auth);
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile$/);
    await profilePage.tabInvitations.click();

    const incomingInvitationRow = profilePage.getIncomingInvitationRow(/./).first();
    await expect(incomingInvitationRow).toBeVisible({ timeout: 10_000 });

    const declineResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/invitations/') &&
        response.url().includes('/decline') &&
        response.request().method() === 'POST',
    );

    await profilePage.getIncomingInvitationDeclineButton(/./).first().click();
    const declineResponse = await declineResponsePromise;
    expect(declineResponse.ok()).toBeTruthy();

    await expect(page.getByTestId(/profile-incoming-invitation-row-/)).toHaveCount(0, { timeout: 10_000 });
  });

  test('TC-04: Owner cancels sent invitation from profile invitations tab on real backend', async ({ page, teamPage, profilePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Real backend flow: owner sends invitation, opens profile invitations tab and cancels sent invitation from there.',
    });

    const owner = await registerAndSetAuthStorage(page, {
      firstName: 'Owner',
      lastName: 'CancelSent',
      emailPrefix: 'e2e-invite',
    });
    const invitee = await registerRandomUserViaApi(page.request, {
      firstName: 'Invitee',
      lastName: 'CancelSent',
      emailPrefix: 'e2e-invite',
    });

    const orgId = await createOrganizationViaApi(page.request, owner.auth.accessToken, `Invite Cancel Sent Org ${Date.now()}`);

    await page.goto(`/dashboard/${orgId}/team`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${orgId}/team$`));

    await teamPage.openInviteDialogButton.click();
    await expect(teamPage.inviteDialog).toBeVisible();
    await teamPage.inviteEmailTab.click();
    await teamPage.inviteEmailInput.fill(invitee.auth.user.email);

    const inviteResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/organizations/${orgId}/invites/email`) &&
        response.request().method() === 'POST',
    );

    await teamPage.sendEmailButton.click();
    const inviteResponse = await inviteResponsePromise;
    expect(inviteResponse.ok()).toBeTruthy();

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile$/);
    await profilePage.tabInvitations.click();
    await expect(profilePage.tabContentInvitations).toBeVisible();

    const sentInvitationRow = profilePage.getSentInvitationRow(/./).first();
    await expect(sentInvitationRow).toBeVisible({ timeout: 10_000 });

    const cancelResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/organizations/${orgId}/invites/`) &&
        response.request().method() === 'DELETE',
    );

    await profilePage.getSentInvitationCancelButton(/./).first().click();
    const cancelResponse = await cancelResponsePromise;
    expect(cancelResponse.ok()).toBeTruthy();

    await expect(page.getByTestId(/profile-sent-invitation-row-/)).toHaveCount(0, { timeout: 10_000 });
  });

  test('TC-05: Dashboard profile icon shows pending invitations badge for invited user', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Real backend flow: invited user with an existing organization opens dashboard and sees pending invitations badge on profile icon.',
    });

    const owner = await registerRandomUserViaApi(page.request, {
      firstName: 'Owner',
      lastName: 'BadgeFlow',
      emailPrefix: 'e2e-invite',
    });
    const invitee = await registerRandomUserViaApi(page.request, {
      firstName: 'Invitee',
      lastName: 'BadgeFlow',
      emailPrefix: 'e2e-invite',
    });

    const ownerOrgId = await createOrganizationViaApi(page.request, owner.auth.accessToken, `Invite Badge Owner Org ${Date.now()}`);
    const inviteeOrgId = await createOrganizationViaApi(page.request, invitee.auth.accessToken, `Invite Badge Invitee Org ${Date.now()}`);

    await createEmailInviteViaApi(page.request, owner.auth.accessToken, ownerOrgId, invitee.auth.user.email, 2);

    await setAuthStorage(page, invitee.auth);
    await page.goto(`/dashboard/${inviteeOrgId}`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${inviteeOrgId}`));

    const profileBadge = page.getByTestId('dashboard-profile-invitations-badge');
    await expect(profileBadge).toBeVisible({ timeout: 10_000 });
    await expect(profileBadge).toHaveText('1');
  });
});
