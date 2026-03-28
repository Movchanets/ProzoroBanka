import { test, expect } from '@playwright/test';

import en from '../src/i18n/locales/en.json' with { type: 'json' };
import uk from '../src/i18n/locales/uk.json' with { type: 'json' };
import { createOrganizationViaApi, getAccessTokenFromAuthStorage, loginViaUi } from './support/e2e-auth';

const VALID_EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'Qwerty-1';

const locales = [
  { key: 'uk', browserLocale: 'uk-UA', uiLanguage: 'uk', dictionary: uk },
  { key: 'en', browserLocale: 'en-US', uiLanguage: 'en', dictionary: en },
] as const;

for (const localeConfig of locales) {
  test.describe(`Admin navigation [${localeConfig.key}]`, () => {
    test.use({ locale: localeConfig.browserLocale });

    test('admin can open admin panel from dashboard', async ({ page }) => {
      await page.addInitScript((lang) => {
        localStorage.setItem('prozoro-banka-lang', lang);
      }, localeConfig.uiLanguage);

      await loginViaUi(page, VALID_EMAIL, VALID_PASSWORD, {
        gotoPath: '/login',
        expectedUrlPattern: /.*\/(onboarding|dashboard).*/,
        setLanguage: false,
      });

      await expect
        .poll(
          async () =>
            page.evaluate(() => {
              const raw = localStorage.getItem('auth-storage');
              if (!raw) return 0;

              const parsed = JSON.parse(raw) as { state?: { user?: { roles?: string[] } } };
              return parsed.state?.user?.roles?.length ?? 0;
            }),
          { timeout: 10_000 },
        )
        .toBeGreaterThan(0);

      const token = await getAccessTokenFromAuthStorage(page);
      const orgId = await createOrganizationViaApi(page.request, token, `Admin nav org ${Date.now()}`);

      await page.goto(`/dashboard/${orgId}`);
      await expect(page.getByTestId('dashboard-admin-link')).toBeVisible();

      await page.getByTestId('dashboard-admin-link').click();
      await expect(page).toHaveURL(/.*\/admin/);
    });

    test('regular user should not see admin transition controls', async ({ page, request }) => {
      await page.addInitScript((lang) => {
        localStorage.setItem('prozoro-banka-lang', lang);
      }, localeConfig.uiLanguage);

      const unique = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      const email = `regular-${unique}@example.com`;

      const registerResponse = await request.post(`${process.env.E2E_API_URL ?? 'http://localhost:5188'}/api/auth/register`, {
        data: {
          email,
          password: VALID_PASSWORD,
          confirmPassword: VALID_PASSWORD,
          firstName: 'Regular',
          lastName: 'User',
          turnstileToken: process.env.E2E_TURNSTILE_TOKEN ?? 'XXXX.DUMMY.TOKEN.XXXX',
        },
      });

      expect(registerResponse.ok()).toBeTruthy();

      await loginViaUi(page, email, VALID_PASSWORD, {
        gotoPath: '/login',
        expectedUrlPattern: /.*\/(onboarding|dashboard).*/,
        setLanguage: false,
      });

      await page.goto('/profile');
      await expect(page.getByTestId('app-shell-admin-link')).toHaveCount(0);
    });
  });
}
