import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { setTestLanguage } from './i18n';

export const E2E_API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:5188';
// Cloudflare official testing response token for server-side validation flows.
export const E2E_TURNSTILE_TEST_TOKEN = process.env.E2E_TURNSTILE_TOKEN ?? 'XXXX.DUMMY.TOKEN.XXXX';
export const E2E_DEFAULT_PASSWORD = 'Qwerty-1';
const SEEDED_ADMIN_EMAIL = 'admin@example.com';
const SEEDED_ADMIN_PASSWORD_FALLBACKS = [E2E_DEFAULT_PASSWORD, 'Admin123!ChangeMe'];

const RETRYABLE_HTTP_STATUS = new Set([500, 502, 503, 504]);

function isRetryableStatus(status: number) {
  return RETRYABLE_HTTP_STATUS.has(status);
}

function shouldTrySeededAdminFallbacks(email: string) {
  return !process.env.E2E_PASSWORD && email.toLowerCase() === SEEDED_ADMIN_EMAIL;
}

function buildPasswordCandidates(email: string, password: string) {
  if (!shouldTrySeededAdminFallbacks(email)) {
    return [password];
  }

  const uniqueCandidates = new Set<string>([password, ...SEEDED_ADMIN_PASSWORD_FALLBACKS]);
  return Array.from(uniqueCandidates);
}

function isInvalidCredentialsResponse(status: number, body: string) {
  if (status !== 401) {
    return false;
  }

  return /невірний email або пароль|invalid email or password/i.test(body);
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles?: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  user: AuthUser;
}

export interface RegisteredUser {
  auth: AuthResponse;
  password: string;
}

function buildAuthStorageState(auth: AuthResponse): string {
  return JSON.stringify({
    state: {
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      accessTokenExpiry: auth.accessTokenExpiry,
      user: auth.user,
      isAuthenticated: true,
    },
    version: 0,
  });
}

export async function registerRandomUserViaApi(
  request: APIRequestContext,
  options?: {
    firstName?: string;
    lastName?: string;
    emailPrefix?: string;
    password?: string;
  },
): Promise<RegisteredUser> {
  const uniquePart = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const firstName = options?.firstName ?? 'E2E';
  const lastName = options?.lastName ?? 'User';
  const emailPrefix = options?.emailPrefix ?? 'e2e';
  const password = options?.password ?? E2E_DEFAULT_PASSWORD;
  const email = `${emailPrefix}-${uniquePart}@example.com`;

  const registerResponse = await request.post(`${E2E_API_BASE_URL}/api/auth/register`, {
    data: {
      email,
      password,
      confirmPassword: password,
      firstName,
      lastName,
      turnstileToken: E2E_TURNSTILE_TEST_TOKEN,
    },
  });

  if (!registerResponse.ok()) {
    throw new Error(`Failed to register user ${email}: ${registerResponse.status()} ${await registerResponse.text()}`);
  }

  return {
    auth: (await registerResponse.json()) as AuthResponse,
    password,
  };
}

export async function loginViaApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const passwordCandidates = buildPasswordCandidates(email, password);
  const errors: string[] = [];

  for (const candidate of passwordCandidates) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await request.post(`${E2E_API_BASE_URL}/api/auth/login`, {
        data: {
          email,
          password: candidate,
          turnstileToken: E2E_TURNSTILE_TEST_TOKEN,
        },
      });

      if (response.ok()) {
        return (await response.json()) as AuthResponse;
      }

      const status = response.status();
      const body = await response.text();
      errors.push(`Failed to login user ${email}: ${status} ${body}`);

      const canRetrySameCandidate = isRetryableStatus(status)
        || (shouldTrySeededAdminFallbacks(email) && isInvalidCredentialsResponse(status, body));

      if (!canRetrySameCandidate || attempt === 3) {
        break;
      }

      await delay(500 * attempt);
    }
  }

  throw new Error(errors.at(-1) ?? `Failed to login user ${email}`);
}

export async function setAuthStorage(page: Page, auth: AuthResponse): Promise<void> {
  const serializedAuthState = buildAuthStorageState(auth);

  await page.addInitScript((value) => {
    localStorage.setItem('auth-storage', value);
  }, serializedAuthState);

  if (page.url().startsWith('http://') || page.url().startsWith('https://')) {
    await page.evaluate((value) => {
      localStorage.setItem('auth-storage', value);
    }, serializedAuthState);
  }
}

export async function getAccessTokenFromAuthStorage(page: Page): Promise<string> {
  const authData = await page.evaluate(() => localStorage.getItem('auth-storage'));
  if (!authData) {
    throw new Error('Missing auth-storage in localStorage');
  }

  const { state } = JSON.parse(authData) as { state?: { accessToken?: string } };
  if (!state?.accessToken) {
    throw new Error('Missing access token in auth-storage');
  }

  return state.accessToken;
}

export async function createOrganizationViaApi(
  request: APIRequestContext,
  accessToken: string,
  name: string,
): Promise<string> {
  let lastError = '';

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await request.post(`${E2E_API_BASE_URL}/api/organizations`, {
      data: {
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok()) {
      const org = (await response.json()) as { id: string };
      return org.id;
    }

    const status = response.status();
    const body = await response.text();
    lastError = `Failed to create organization: ${status} ${body}`;

    if (!isRetryableStatus(status) || attempt === 3) {
      break;
    }

    await delay(500 * attempt);
  }

  throw new Error(lastError);
}

export async function createInviteLinkViaApi(
  request: APIRequestContext,
  accessToken: string,
  organizationId: string,
  role = 2,
  expiresInHours = 24,
): Promise<string> {
  const response = await request.post(`${E2E_API_BASE_URL}/api/organizations/${organizationId}/invites/link`, {
    data: { role, expiresInHours },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create invite link: ${response.status()} ${await response.text()}`);
  }

  const invitation = (await response.json()) as { token: string };
  return invitation.token;
}

export async function createEmailInviteViaApi(
  request: APIRequestContext,
  accessToken: string,
  organizationId: string,
  email: string,
  role: number,
): Promise<void> {
  const response = await request.post(`${E2E_API_BASE_URL}/api/organizations/${organizationId}/invites/email`, {
    data: { email, role },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create email invite: ${response.status()} ${await response.text()}`);
  }
}

export async function loginViaUi(
  page: Page,
  email: string,
  password: string,
  options?: {
    gotoPath?: string | null;
    setLanguage?: boolean;
    expectedUrlPattern?: RegExp;
    turnstileTimeoutMs?: number;
  },
): Promise<void> {
  const turnstileTimeoutMs = options?.turnstileTimeoutMs ?? 20_000;

  if (options?.setLanguage !== false) {
    await setTestLanguage(page, 'uk');
  }

  if (options?.gotoPath !== null) {
    await page.goto(options?.gotoPath ?? '/login');
  }

  await ensureTurnstileTokenForE2E(page, { timeoutMs: turnstileTimeoutMs });
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  await ensureTurnstileTokenForE2E(page, { timeoutMs: turnstileTimeoutMs });
  await page.getByTestId('login-submit-button').click();

  if (options?.expectedUrlPattern) {
    await expect(page).toHaveURL(options.expectedUrlPattern, { timeout: 10_000 });
  }
}

export async function registerAndSetAuthStorage(
  page: Page,
  options?: {
    firstName?: string;
    lastName?: string;
    emailPrefix?: string;
    password?: string;
  },
): Promise<RegisteredUser> {
  const registeredUser = await registerRandomUserViaApi(page.request, options);
  await setTestLanguage(page, 'uk');
  await setAuthStorage(page, registeredUser.auth);
  return registeredUser;
}

export async function createOrganizationForCurrentSession(page: Page, name: string): Promise<string> {
  const token = await getAccessTokenFromAuthStorage(page);
  return createOrganizationViaApi(page.request, token, name);
}

export async function ensureTurnstileTokenForE2E(
  page: Page,
  options?: { timeoutMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 20_000;
  const tokenInput = page.locator('input[name="cf-turnstile-response"]').first();

  await expect(tokenInput).toHaveValue(/.+/, { timeout: timeoutMs });

  const currentToken = (await tokenInput.inputValue()).trim();
  if (currentToken === E2E_TURNSTILE_TEST_TOKEN) {
    return;
  }

  await tokenInput.evaluate((element, token) => {
    const input = element as {
      value: string;
      dispatchEvent: (event: Event) => boolean;
    };
    input.value = token;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, E2E_TURNSTILE_TEST_TOKEN);

  await expect(tokenInput).toHaveValue(E2E_TURNSTILE_TEST_TOKEN);
}
