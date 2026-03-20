import { test, expect, type Page } from '@playwright/test';
import { t, setTestLanguage } from './support/i18n';

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:5188';
const TURNSTILE_TIMEOUT = 30_000;

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  user: AuthUser;
}

async function getTurnstileToken(page: Page): Promise<string> {
  await setTestLanguage(page);
  await page.goto('/register');
  const turnstileInput = page.locator('input[name="cf-turnstile-response"]');
  await expect(turnstileInput).toHaveValue(/.+/, { timeout: TURNSTILE_TIMEOUT });
  return (await turnstileInput.inputValue()).trim();
}

async function registerUserViaApi(page: Page, firstName: string, lastName: string): Promise<{ auth: AuthResponse; password: string }> {
  const uniquePart = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const email = `invite-e2e-${uniquePart}@example.com`;
  const password = 'Qwerty-1';
  const turnstileToken = await getTurnstileToken(page);

  const response = await page.request.post(`${API_BASE_URL}/api/auth/register`, {
    data: {
      email,
      password,
      confirmPassword: password,
      firstName,
      lastName,
      turnstileToken,
    },
  });

  if (!response.ok()) {
    throw new Error(`Register failed: ${response.status()} ${await response.text()}`);
  }

  return { auth: (await response.json()) as AuthResponse, password };
}

async function createOrganizationViaApi(page: Page, owner: AuthResponse, name: string): Promise<string> {
  const response = await page.request.post(`${API_BASE_URL}/api/organizations`, {
    headers: {
      Authorization: `Bearer ${owner.accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
    },
  });

  if (!response.ok()) {
    throw new Error(`Create org failed: ${response.status()} ${await response.text()}`);
  }

  const organization = (await response.json()) as { id: string };
  return organization.id;
}

async function createInviteLinkViaApi(page: Page, owner: AuthResponse, orgId: string): Promise<string> {
  const response = await page.request.post(`${API_BASE_URL}/api/organizations/${orgId}/invites/link`, {
    headers: {
      Authorization: `Bearer ${owner.accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      role: 2,
      expiresInHours: 24,
    },
  });

  if (!response.ok()) {
    throw new Error(`Create invite link failed: ${response.status()} ${await response.text()}`);
  }

  const invitation = (await response.json()) as { token: string };
  return invitation.token;
}

async function loginViaUi(page: Page, email: string, password: string) {
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: TURNSTILE_TIMEOUT });
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  await page.getByTestId('login-submit-button').click();
}

test.describe('Invite Flow', () => {
  test('TC-01: Guest is redirected to login with next, then after login sees invite page', async ({ page }) => {
    const owner = await registerUserViaApi(page, 'Owner', 'Invite');
    const invitee = await registerUserViaApi(page, 'Member', 'Invite');

    const orgId = await createOrganizationViaApi(page, owner.auth, `Invite Flow Org ${Date.now()}`);
    const inviteToken = await createInviteLinkViaApi(page, owner.auth, orgId);

    await setTestLanguage(page);
    await page.goto(`/invite/${inviteToken}`);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Finvite%2F${inviteToken}$`));

    await loginViaUi(page, invitee.auth.user.email, invitee.password);

    await expect(page).toHaveURL(new RegExp(`/invite/${inviteToken}$`));
    await expect(page.getByTestId('invite-page-card')).toBeVisible();
    await expect(page.getByTestId('invite-page-org-title')).toContainText('Invite Flow Org');
  });

  test('TC-02: Logged-in invited user can accept invitation from invite page', async ({ page }) => {
    const owner = await registerUserViaApi(page, 'Owner', 'Accept');
    const invitee = await registerUserViaApi(page, 'Member', 'Accept');

    const orgId = await createOrganizationViaApi(page, owner.auth, `Accept Flow Org ${Date.now()}`);
    const inviteToken = await createInviteLinkViaApi(page, owner.auth, orgId);

    await setTestLanguage(page);
    await page.goto(`/invite/${inviteToken}`);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Finvite%2F${inviteToken}$`));

    await loginViaUi(page, invitee.auth.user.email, invitee.password);
    await expect(page).toHaveURL(new RegExp(`/invite/${inviteToken}$`));

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
    const owner = await registerUserViaApi(page, 'Owner', 'Decline');
    const invitee = await registerUserViaApi(page, 'Member', 'Decline');

    const orgId = await createOrganizationViaApi(page, owner.auth, `Decline Flow Org ${Date.now()}`);
    const inviteToken = await createInviteLinkViaApi(page, owner.auth, orgId);

    await setTestLanguage(page);
    await page.goto(`/invite/${inviteToken}`);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Finvite%2F${inviteToken}$`));

    await loginViaUi(page, invitee.auth.user.email, invitee.password);
    await expect(page).toHaveURL(new RegExp(`/invite/${inviteToken}$`));

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
