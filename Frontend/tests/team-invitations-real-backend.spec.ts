import { test, expect } from '@playwright/test';

import { setTestLanguage } from './support/i18n';
import {
  createEmailInviteViaApi,
  createOrganizationViaApi,
  registerRandomUserViaApi,
  setAuthStorage,
} from './support/e2e-auth';

test.describe.configure({ timeout: 90_000 });

test.describe('Team Invitations — Real Backend', () => {
  test.beforeEach(async ({ page }) => {
    await setTestLanguage(page, 'uk');
  });

  test('TC-01: Owner sends email invite, invitee accepts in profile, owner changes role in Team actions', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Real backend flow: create owner/invitee users, create org, send email invite, onboarding->profile transition, accept in profile, back to onboarding/dashboard, verify and change role in Team actions.',
    });

    const owner = await registerRandomUserViaApi(page.request, {
      firstName: 'Owner',
      lastName: 'E2E',
      emailPrefix: 'e2e-invite',
    });
    const invitee = await registerRandomUserViaApi(page.request, {
      firstName: 'Invitee',
      lastName: 'E2E',
      emailPrefix: 'e2e-invite',
    });

    await setAuthStorage(page, owner.auth);
    const orgId = await createOrganizationViaApi(page.request, owner.auth.accessToken, `Invite Org ${Date.now()}`);

    await page.goto(`/dashboard/${orgId}/team`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${orgId}/team$`));

    await page.getByTestId('team-open-invite-dialog-button').click();
    await expect(page.getByTestId('team-invite-dialog')).toBeVisible();

    await page.getByTestId('team-invite-email-tab').click();
    await page.getByTestId('team-invite-email-input').fill(invitee.auth.user.email);

    const inviteResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/organizations/${orgId}/invites/email`) &&
        response.request().method() === 'POST',
    );

    await page.getByTestId('team-invite-send-email-button').click();
    const inviteResponse = await inviteResponsePromise;
    expect(inviteResponse.ok()).toBeTruthy();

    await page.getByTestId('team-invite-close-button').click();

    await setAuthStorage(page, invitee.auth);
    await page.goto('/onboarding');
    await expect(page.getByTestId('onboarding-go-profile-button')).toBeVisible();
    await page.getByTestId('onboarding-go-profile-button').click();
    await expect(page).toHaveURL(/\/profile$/);

    await page.getByTestId('profile-tab-invitations').click();
    await expect(page.getByTestId('profile-tab-content-invitations')).toBeVisible();

    const incomingInvitationRow = page.getByTestId(/profile-incoming-invitation-row-/).first();
    await expect(incomingInvitationRow).toBeVisible({ timeout: 10_000 });

    const acceptResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/invitations/') &&
        response.url().includes('/accept') &&
        response.request().method() === 'POST',
    );

    await incomingInvitationRow.locator('[data-testid^="profile-incoming-invitation-accept-"]').click();
    const acceptResponse = await acceptResponsePromise;
    expect(acceptResponse.ok()).toBeTruthy();

    await page.getByTestId('profile-go-onboarding-button').click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/${orgId}`));

    await setAuthStorage(page, owner.auth);
    await page.goto(`/dashboard/${orgId}/team`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${orgId}/team$`));

    const inviteeRow = page.getByRole('row').filter({ hasText: invitee.auth.user.email });
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

  test('TC-02: Invite link tab generates a valid link on real backend', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Real backend flow: owner opens invite dialog, generates link invite, verifies API success and generated invite URL visibility.',
    });

    const owner = await registerRandomUserViaApi(page.request, {
      firstName: 'Owner',
      lastName: 'LinkInvite',
      emailPrefix: 'e2e-invite',
    });
    await setAuthStorage(page, owner.auth);
    const orgId = await createOrganizationViaApi(page.request, owner.auth.accessToken, `Invite Link Org ${Date.now()}`);

    await page.goto(`/dashboard/${orgId}/team`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${orgId}/team$`));

    await page.getByTestId('team-open-invite-dialog-button').click();
    await expect(page.getByTestId('team-invite-dialog')).toBeVisible();
    await page.getByTestId('team-invite-link-tab').click();

    const createLinkResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/organizations/${orgId}/invites/link`) &&
        response.request().method() === 'POST',
    );

    await page.getByTestId('team-invite-generate-link-button').click();
    const createLinkResponse = await createLinkResponsePromise;
    expect(createLinkResponse.ok()).toBeTruthy();

    const linkInput = page.getByTestId('team-invite-link-input');
    await expect(linkInput).toBeVisible();
    await expect(linkInput).toHaveValue(new RegExp('/invite/.+'));
  });

  test('TC-03: Invitee declines incoming invitation in profile tab on real backend', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Real backend flow: owner creates email invite, invitee opens profile invitations tab, declines invite and verifies it no longer appears as incoming pending.',
    });

    const owner = await registerRandomUserViaApi(page.request, {
      firstName: 'Owner',
      lastName: 'DeclineFlow',
      emailPrefix: 'e2e-invite',
    });
    const invitee = await registerRandomUserViaApi(page.request, {
      firstName: 'Invitee',
      lastName: 'DeclineFlow',
      emailPrefix: 'e2e-invite',
    });

    await setAuthStorage(page, owner.auth);
    const orgId = await createOrganizationViaApi(page.request, owner.auth.accessToken, `Invite Decline Org ${Date.now()}`);
    await createEmailInviteViaApi(page.request, owner.auth.accessToken, orgId, invitee.auth.user.email, 2);

    await setAuthStorage(page, invitee.auth);
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile$/);
    await page.getByTestId('profile-tab-invitations').click();

    const incomingInvitationRow = page.getByTestId(/profile-incoming-invitation-row-/).first();
    await expect(incomingInvitationRow).toBeVisible({ timeout: 10_000 });

    const declineResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/invitations/') &&
        response.url().includes('/decline') &&
        response.request().method() === 'POST',
    );

    await incomingInvitationRow.locator('[data-testid^="profile-incoming-invitation-decline-"]').click();
    const declineResponse = await declineResponsePromise;
    expect(declineResponse.ok()).toBeTruthy();

    await expect(page.getByTestId(/profile-incoming-invitation-row-/)).toHaveCount(0, { timeout: 10_000 });
  });

  test('TC-04: Owner cancels sent invitation from profile invitations tab on real backend', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Real backend flow: owner sends invitation, opens profile invitations tab and cancels sent invitation from there.',
    });

    const owner = await registerRandomUserViaApi(page.request, {
      firstName: 'Owner',
      lastName: 'CancelSent',
      emailPrefix: 'e2e-invite',
    });
    const invitee = await registerRandomUserViaApi(page.request, {
      firstName: 'Invitee',
      lastName: 'CancelSent',
      emailPrefix: 'e2e-invite',
    });

    await setAuthStorage(page, owner.auth);
    const orgId = await createOrganizationViaApi(page.request, owner.auth.accessToken, `Invite Cancel Sent Org ${Date.now()}`);

    await page.goto(`/dashboard/${orgId}/team`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${orgId}/team$`));

    await page.getByTestId('team-open-invite-dialog-button').click();
    await expect(page.getByTestId('team-invite-dialog')).toBeVisible();
    await page.getByTestId('team-invite-email-tab').click();
    await page.getByTestId('team-invite-email-input').fill(invitee.auth.user.email);

    const inviteResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/organizations/${orgId}/invites/email`) &&
        response.request().method() === 'POST',
    );

    await page.getByTestId('team-invite-send-email-button').click();
    const inviteResponse = await inviteResponsePromise;
    expect(inviteResponse.ok()).toBeTruthy();

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile$/);
    await page.getByTestId('profile-tab-invitations').click();
    await expect(page.getByTestId('profile-tab-content-invitations')).toBeVisible();

    const sentInvitationRow = page.getByTestId(/profile-sent-invitation-row-/).first();
    await expect(sentInvitationRow).toBeVisible({ timeout: 10_000 });

    const cancelResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/organizations/${orgId}/invites/`) &&
        response.request().method() === 'DELETE',
    );

    await sentInvitationRow.locator('[data-testid^="profile-sent-invitation-cancel-"]').click();
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
