import { expect, type Page } from '@playwright/test';

import { setAuthStorage, type AuthResponse } from './e2e-auth';
import { applyLocale, type TestLanguage } from './locale-matrix';

export const seededAdminAuth: AuthResponse = {
  accessToken: 'e2e-admin-token',
  refreshToken: 'e2e-admin-refresh-token',
  accessTokenExpiry: '2099-01-01T00:00:00Z',
  refreshTokenExpiry: '2099-01-01T00:00:00Z',
  csrfToken: 'e2e-admin-csrf-token',
  user: {
    id: 'e2e-admin-id',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'E2E',
    roles: ['Admin'],
  },
} as AuthResponse;

export async function seedAdminSession(page: Page, locale: TestLanguage): Promise<void> {
  await applyLocale(page, locale);
  await setAuthStorage(page, seededAdminAuth);

  // Mock profile endpoint to avoid 401 with the mock token
  await page.route('**/api/users/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(seededAdminAuth.user),
    });
  });

  // Also mock /auth/me which is sometimes used
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...seededAdminAuth.user,
        roles: ['Admin']
      }),
    });
  });

  // Auth navigation resolves default routes using organization list.
  await page.route('**/api/organizations/my', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'org-nav-admin',
          name: 'Admin Org',
          slug: 'admin-org',
        },
      ]),
    });
  });
}

export async function expectAdminRoleInStorage(page: Page, timeout = 10_000): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const raw = localStorage.getItem('auth-storage');
          if (!raw) return false;

          const parsed = JSON.parse(raw) as { state?: { user?: { roles?: string[] } } };
          const roles = parsed.state?.user?.roles ?? [];
          return roles.some((role) => role.toLowerCase() === 'admin');
        }),
      { timeout },
    )
    .toBe(true);
}
