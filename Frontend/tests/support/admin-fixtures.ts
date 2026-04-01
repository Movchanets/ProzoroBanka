import { expect, type Page } from '@playwright/test';

import { setAuthStorage, type AuthResponse } from './e2e-auth';
import { applyLocale, type TestLanguage } from './locale-matrix';

export const seededAdminAuth: AuthResponse = {
  accessToken: 'e2e-admin-token',
  refreshToken: 'e2e-admin-refresh-token',
  accessTokenExpiry: '2099-01-01T00:00:00Z',
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
