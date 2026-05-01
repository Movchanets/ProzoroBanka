import { expect, type APIRequestContext, type APIResponse, type Page } from "@playwright/test";
import { setTestLanguage } from "./i18n";
import { gotoAppPath, waitForAppReady } from "./navigation";

export const E2E_API_BASE_URL =
  process.env.E2E_API_URL ?? "http://localhost:5188";
const ACCESS_TOKEN_COOKIE_NAME = "pb_access_token";
const REFRESH_TOKEN_COOKIE_NAME = "pb_refresh_token";
const CSRF_COOKIE_NAME = "pb_csrf_token";
// Cloudflare official testing response token for server-side validation flows.
export const E2E_TURNSTILE_TEST_TOKEN =
  process.env.E2E_TURNSTILE_TOKEN ?? "XXXX.DUMMY.TOKEN.XXXX";
export const E2E_DEFAULT_PASSWORD = "Qwerty-1";
export const E2E_SEEDED_ADMIN_EMAIL =
  process.env.E2E_EMAIL ?? "admin@example.com";
export const E2E_SEEDED_ADMIN_PASSWORD =
  process.env.E2E_PASSWORD ?? E2E_DEFAULT_PASSWORD;
const SEEDED_ADMIN_PASSWORD_FALLBACKS = [
  E2E_DEFAULT_PASSWORD,
  "Admin123!ChangeMe",
];

export function getSeededAdminCredentials() {
  return {
    email: E2E_SEEDED_ADMIN_EMAIL,
    password: E2E_SEEDED_ADMIN_PASSWORD,
  };
}

const RETRYABLE_HTTP_STATUS = new Set([500, 502, 503, 504]);

function isRetryableStatus(status: number) {
  return RETRYABLE_HTTP_STATUS.has(status);
}

function shouldTrySeededAdminFallbacks(email: string) {
  return (
    !process.env.E2E_PASSWORD && email.toLowerCase() === E2E_SEEDED_ADMIN_EMAIL
  );
}

function buildPasswordCandidates(email: string, password: string) {
  if (!shouldTrySeededAdminFallbacks(email)) {
    return [password];
  }

  const uniqueCandidates = new Set<string>([
    password,
    ...SEEDED_ADMIN_PASSWORD_FALLBACKS,
  ]);
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
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  refreshTokenExpiry?: string;
  csrfToken: string;
}

export interface RegisteredUser {
  auth: AuthResponse;
  password: string;
}

function buildAuthStorageState(auth: AuthResponse): string {
  return JSON.stringify({
    state: {
      user: auth.user,
      isAuthenticated: true,
    },
    version: 0,
  });
}

function buildCookieExpiry(
  isoString: string | undefined,
  fallbackMinutes: number,
): number {
  const parsed = isoString ? Date.parse(isoString) : Number.NaN;
  if (!Number.isNaN(parsed)) {
    return Math.floor(parsed / 1000);
  }

  return Math.floor((Date.now() + fallbackMinutes * 60_000) / 1000);
}

function createCsrfToken(): string {
  return `e2e-csrf-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function parseSameSite(value: string | undefined): "Strict" | "Lax" | "None" | undefined {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "strict":
      return "Strict";
    case "none":
      return "None";
    case "lax":
      return "Lax";
    default:
      return undefined;
  }
}

function parseSetCookieHeader(setCookieHeader: string) {
  const [nameValue, ...attributeParts] = setCookieHeader.split(";");
  const separatorIndex = nameValue.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  const name = nameValue.slice(0, separatorIndex).trim();
  const value = nameValue.slice(separatorIndex + 1).trim();
  const attributes = new Map<string, string>();

  for (const rawAttribute of attributeParts) {
    const [attributeName, ...attributeValueParts] = rawAttribute.trim().split("=");
    attributes.set(
      attributeName.toLowerCase(),
      attributeValueParts.join("=").trim(),
    );
  }

  return {
    name,
    value,
    expires: attributes.get("expires"),
    httpOnly: attributes.has("httponly"),
    secure: attributes.has("secure"),
    sameSite: parseSameSite(attributes.get("samesite")),
  };
}

async function readAuthResponse(response: APIResponse): Promise<AuthResponse> {
  const payload = (await response.json()) as { user: AuthUser };
  const auth: AuthResponse = {
    user: payload.user,
    accessToken: "",
    refreshToken: "",
    accessTokenExpiry: "",
    refreshTokenExpiry: undefined,
    csrfToken: "",
  };

  for (const header of response.headersArray()) {
    if (header.name.toLowerCase() !== "set-cookie") {
      continue;
    }

    const cookie = parseSetCookieHeader(header.value);
    if (!cookie) {
      continue;
    }

    const expiresAt = cookie.expires
      ? new Date(cookie.expires).toISOString()
      : undefined;

    switch (cookie.name) {
      case ACCESS_TOKEN_COOKIE_NAME:
        auth.accessToken = cookie.value;
        if (expiresAt) {
          auth.accessTokenExpiry = expiresAt;
        }
        break;
      case REFRESH_TOKEN_COOKIE_NAME:
        auth.refreshToken = cookie.value;
        auth.refreshTokenExpiry = expiresAt;
        break;
      case CSRF_COOKIE_NAME:
        auth.csrfToken = cookie.value;
        break;
      default:
        break;
    }
  }

  if (!auth.accessToken || !auth.refreshToken || !auth.csrfToken) {
    throw new Error("Auth response is missing required auth cookies");
  }

  if (!auth.accessTokenExpiry) {
    auth.accessTokenExpiry = new Date(
      Date.now() + 15 * 60_000,
    ).toISOString();
  }

  return auth;
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
  const firstName = options?.firstName ?? "E2E";
  const lastName = options?.lastName ?? "User";
  const emailPrefix = options?.emailPrefix ?? "e2e";
  const password = options?.password ?? E2E_DEFAULT_PASSWORD;
  const email = `${emailPrefix}-${uniquePart}@example.com`;

  const registerResponse = await request.post(
    `${E2E_API_BASE_URL}/api/auth/register`,
    {
      data: {
        email,
        password,
        confirmPassword: password,
        firstName,
        lastName,
        turnstileToken: E2E_TURNSTILE_TEST_TOKEN,
      },
    },
  );

  if (!registerResponse.ok()) {
    throw new Error(
      `Failed to register user ${email}: ${registerResponse.status()} ${await registerResponse.text()}`,
    );
  }

  return {
    auth: await readAuthResponse(registerResponse),
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
      const response = await request.post(
        `${E2E_API_BASE_URL}/api/auth/login`,
        {
          data: {
            email,
            password: candidate,
            turnstileToken: E2E_TURNSTILE_TEST_TOKEN,
          },
        },
      );

      if (response.ok()) {
        return readAuthResponse(response);
      }

      const status = response.status();
      const body = await response.text();
      errors.push(`Failed to login user ${email}: ${status} ${body}`);

      const canRetrySameCandidate =
        isRetryableStatus(status) ||
        (shouldTrySeededAdminFallbacks(email) &&
          isInvalidCredentialsResponse(status, body));

      if (!canRetrySameCandidate || attempt === 3) {
        break;
      }

      await delay(500 * attempt);
    }
  }

  throw new Error(errors.at(-1) ?? `Failed to login user ${email}`);
}

export async function setAuthStorage(
  page: Page,
  auth: AuthResponse,
): Promise<void> {
  const serializedAuthState = buildAuthStorageState(auth);
  await page.context().addCookies([
    {
      name: ACCESS_TOKEN_COOKIE_NAME,
      value: auth.accessToken,
      url: E2E_API_BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
      expires: buildCookieExpiry(auth.accessTokenExpiry, 15),
    },
    {
      name: REFRESH_TOKEN_COOKIE_NAME,
      value: auth.refreshToken,
      url: E2E_API_BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
      expires: buildCookieExpiry(auth.refreshTokenExpiry, 7 * 24 * 60),
    },
    {
      name: CSRF_COOKIE_NAME,
      value: auth.csrfToken || createCsrfToken(),
      url: E2E_API_BASE_URL,
      httpOnly: false,
      sameSite: "Lax",
      expires: buildCookieExpiry(auth.refreshTokenExpiry, 7 * 24 * 60),
    },
  ]);

  await page.addInitScript((value) => {
    localStorage.removeItem("workspace-storage");
    localStorage.setItem("auth-storage", value);
  }, serializedAuthState);

  if (page.url().startsWith("http://") || page.url().startsWith("https://")) {
    await page.evaluate((value) => {
      localStorage.removeItem("workspace-storage");
      localStorage.setItem("auth-storage", value);
    }, serializedAuthState);
  }
}

export async function setWorkspaceStorage(
  page: Page,
  activeOrgId: string | null,
): Promise<void> {
  const serializedWorkspaceState = JSON.stringify({
    state: { activeOrgId },
    version: 0,
  });

  await page.addInitScript((value) => {
    localStorage.setItem("workspace-storage", value);
  }, serializedWorkspaceState);

  if (page.url().startsWith("http://") || page.url().startsWith("https://")) {
    await page.evaluate((value) => {
      localStorage.setItem("workspace-storage", value);
    }, serializedWorkspaceState);
  }
}

export async function getAccessTokenFromAuthStorage(
  page: Page,
): Promise<string> {
  const authCookies = await page.context().cookies(E2E_API_BASE_URL);
  const accessTokenCookie = authCookies.find(
    (cookie) => cookie.name === ACCESS_TOKEN_COOKIE_NAME,
  );

  if (accessTokenCookie?.value) {
    return accessTokenCookie.value;
  }

  const authData = await page.evaluate(() =>
    localStorage.getItem("auth-storage"),
  );
  if (!authData) {
    throw new Error("Missing auth token in cookies and auth-storage");
  }

  const { state } = JSON.parse(authData) as {
    state?: { accessToken?: string };
  };
  if (!state?.accessToken) {
    throw new Error("Missing access token in auth-storage");
  }

  return state.accessToken;
}

export async function createOrganizationViaApi(
  request: APIRequestContext,
  accessToken: string,
  name: string,
): Promise<string> {
  let lastError = "";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await request.post(
      `${E2E_API_BASE_URL}/api/organizations`,
      {
        data: {
          name,
          slug: name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-"),
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

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
  const response = await request.post(
    `${E2E_API_BASE_URL}/api/organizations/${organizationId}/invites/link`,
    {
      data: { role, expiresInHours },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok()) {
    throw new Error(
      `Failed to create invite link: ${response.status()} ${await response.text()}`,
    );
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
  const response = await request.post(
    `${E2E_API_BASE_URL}/api/organizations/${organizationId}/invites/email`,
    {
      data: { email, role },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok()) {
    throw new Error(
      `Failed to create email invite: ${response.status()} ${await response.text()}`,
    );
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
    await setTestLanguage(page, "uk");
  }

  if (options?.gotoPath !== null) {
    await gotoAppPath(page, options?.gotoPath ?? "/login");
  }

  await waitForTurnstileToken(page, { timeoutMs: turnstileTimeoutMs });
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(password);
  await waitForTurnstileToken(page, { timeoutMs: turnstileTimeoutMs });
  await page.getByTestId("login-submit-button").click();

  if (options?.expectedUrlPattern) {
    await expect(page).toHaveURL(options.expectedUrlPattern, {
      timeout: 10_000,
    });
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
  await setTestLanguage(page, "uk");
  await setAuthStorage(page, registeredUser.auth);
  return registeredUser;
}

export async function createOrganizationForCurrentSession(
  page: Page,
  name: string,
): Promise<string> {
  const token = await getAccessTokenFromAuthStorage(page);
  return createOrganizationViaApi(page.request, token, name);
}

/**
 * Wait for the app-level loading fallback to be hidden after route/auth resolution.
 */
export async function waitForAppLoaded(
  page: Page,
  options?: { timeoutMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 15_000;
  await waitForAppReady(page, timeoutMs);
}

export async function waitForTurnstileToken(
  page: Page,
  options?: { timeoutMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 20_000;
  const tokenInput = page
    .locator('input[name="cf-turnstile-response"]')
    .first();

  await expect(tokenInput).toHaveValue(/.+/, { timeout: timeoutMs });
}
