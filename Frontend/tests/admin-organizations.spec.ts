import { test, expect, type Page } from '@playwright/test';

import en from '../src/i18n/locales/en.json' with { type: 'json' };
import uk from '../src/i18n/locales/uk.json' with { type: 'json' };
import { loginViaUi } from './support/e2e-auth';

type OrganizationPlanType = 1 | 2;
const VALID_EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'Qwerty-1';

const locales = [
  { key: 'uk', browserLocale: 'uk-UA', uiLanguage: 'uk', dictionary: uk },
  { key: 'en', browserLocale: 'en-US', uiLanguage: 'en', dictionary: en },
] as const;

for (const localeConfig of locales) {
  test.describe(`Admin organizations [${localeConfig.key}]`, () => {
    test.use({ locale: localeConfig.browserLocale });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => {
        localStorage.setItem('prozoro-banka-lang', lang);
      }, localeConfig.uiLanguage);

      await loginViaUi(page as Page, VALID_EMAIL, VALID_PASSWORD, {
        gotoPath: '/login',
        expectedUrlPattern: /.*\/(onboarding|dashboard).*/,
        setLanguage: false,
      });
    });

    test('TC-01: page loads and key controls are visible', async ({ page }) => {
      const selectedPlan: OrganizationPlanType = 1;

      await page.route('**/api/admin/organizations**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'org-1',
                name: 'Alpha Org',
                slug: 'alpha-org',
                ownerName: 'Owner One',
                ownerEmail: 'owner1@example.com',
                isVerified: true,
                memberCount: 5,
                campaignCount: 2,
                totalRaised: 12000,
                createdAt: '2026-03-01T10:00:00Z',
                planType: selectedPlan,
              },
            ],
            totalCount: 1,
            page: 1,
            pageSize: 20,
          }),
        });
      });

      await page.route('**/api/admin/organizations/org-1/plan-usage', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isSuccess: true,
            message: null,
            payload: {
              planType: selectedPlan,
              maxCampaigns: selectedPlan === 1 ? 3 : 100,
              currentCampaigns: 2,
              maxMembers: selectedPlan === 1 ? 10 : 200,
              currentMembers: 5,
              maxOcrExtractionsPerMonth: selectedPlan === 1 ? 100 : 5000,
              currentOcrExtractionsPerMonth: 12,
            },
          }),
        });
      });

      await page.goto('/admin/organizations');

      await expect(page.getByTestId('admin-organizations-page')).toBeVisible();
      await expect(page.getByTestId('admin-organizations-search-input')).toBeVisible();
      await expect(page.getByTestId('admin-organizations-filter-all')).toBeVisible();
      await expect(page.getByTestId('admin-organizations-row-org-1')).toBeVisible();
      await expect(page.getByTestId('admin-organizations-plan-panel')).toBeVisible();
      await expect(page.getByTestId('admin-organizations-usage-campaigns')).toBeVisible();
    });

    test('TC-02: search and verified filters stay interactive', async ({ page }) => {
      await page.route('**/api/admin/organizations**', async (route) => {
        const url = new URL(route.request().url());
        const search = url.searchParams.get('search') ?? '';
        const verifiedOnly = url.searchParams.get('verifiedOnly');

        const isVerified = verifiedOnly === 'false' ? false : true;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'org-filtered',
                name: search ? `Found ${search}` : 'Filter Org',
                slug: 'filter-org',
                ownerName: 'Owner Two',
                ownerEmail: 'owner2@example.com',
                isVerified,
                memberCount: 3,
                campaignCount: 1,
                totalRaised: 500,
                createdAt: '2026-03-03T10:00:00Z',
                planType: 1,
              },
            ],
            totalCount: 1,
            page: 1,
            pageSize: 20,
          }),
        });
      });

      await page.route('**/api/admin/organizations/org-filtered/plan-usage', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isSuccess: true,
            message: null,
            payload: {
              planType: 1,
              maxCampaigns: 3,
              currentCampaigns: 1,
              maxMembers: 10,
              currentMembers: 3,
              maxOcrExtractionsPerMonth: 100,
              currentOcrExtractionsPerMonth: 4,
            },
          }),
        });
      });

      await page.goto('/admin/organizations');

      await page.getByTestId('admin-organizations-search-input').fill('Alpha');
      await expect(page.getByTestId('admin-organizations-row-org-filtered')).toBeVisible();

      await page.getByTestId('admin-organizations-filter-unverified').click();
      await expect(page.getByTestId('admin-organizations-row-org-filtered')).toBeVisible();
      await expect(page.getByTestId('admin-organizations-unverified-org-filtered')).toBeVisible();
    });

    test('TC-03: plan switch updates usage values', async ({ page }) => {
      let selectedPlan: OrganizationPlanType = 1;

      await page.route('**/api/admin/organizations**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'org-plan',
                name: 'Plan Org',
                slug: 'plan-org',
                ownerName: 'Owner Plan',
                ownerEmail: 'owner-plan@example.com',
                isVerified: true,
                memberCount: 9,
                campaignCount: 2,
                totalRaised: 1300,
                createdAt: '2026-03-04T10:00:00Z',
                planType: selectedPlan,
              },
            ],
            totalCount: 1,
            page: 1,
            pageSize: 20,
          }),
        });
      });

      await page.route('**/api/admin/organizations/org-plan/plan-usage', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isSuccess: true,
            message: null,
            payload: {
              planType: selectedPlan,
              maxCampaigns: selectedPlan === 1 ? 3 : 100,
              currentCampaigns: 2,
              maxMembers: selectedPlan === 1 ? 10 : 200,
              currentMembers: 9,
              maxOcrExtractionsPerMonth: selectedPlan === 1 ? 100 : 5000,
              currentOcrExtractionsPerMonth: 7,
            },
          }),
        });
      });

      await page.route('**/api/admin/organizations/org-plan/plan', async (route) => {
        const body = route.request().postDataJSON() as { planType: OrganizationPlanType };
        selectedPlan = body.planType;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isSuccess: true,
            message: 'ok',
            payload: null,
          }),
        });
      });

      await page.goto('/admin/organizations');

      await expect(page.getByTestId('admin-organizations-usage-members-value')).toContainText('9 / 10');

      await page.getByTestId('admin-organizations-plan-paid-button').click();
      await page.getByTestId('admin-organizations-plan-apply-button').click();

      await expect(page.getByTestId('admin-organizations-usage-members-value')).toContainText('9 / 200');
      await expect(page.getByTestId('admin-organizations-plan-org-plan')).toContainText('Paid');
    });
  });
}
