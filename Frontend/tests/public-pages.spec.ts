import { expect, test } from '@playwright/test';

const orgPayload = {
  id: 'org-1',
  name: 'Фонд Промінь',
  slug: 'promin',
  description: 'Допомога військовим і медикам.',
  logoUrl: '',
  isVerified: true,
  website: 'https://example.org',
  memberCount: 8,
  activeCampaignCount: 1,
  totalRaised: 275000,
  teamMembers: [
    { userId: 'u1', firstName: 'Ірина', lastName: 'Коваль', avatarUrl: '' },
    { userId: 'u2', firstName: 'Тарас', lastName: 'Мельник', avatarUrl: '' },
  ],
};

const campaignPayload = {
  id: 'camp-1',
  title: 'Тепловізори для евакуаційної бригади',
  description: 'Збираємо на 3 тепловізори для екіпажів.',
  coverImageUrl: '',
  goalAmount: 300000,
  currentAmount: 180000,
  status: 1,
  startDate: null,
  deadline: null,
  progressPercentage: 60,
  daysRemaining: 12,
  organizationId: 'org-1',
  organizationName: 'Фонд Промінь',
  organizationSlug: 'promin',
  latestReceipts: [
    { id: 'r1', merchantName: 'Епіцентр', totalAmount: 54000, transactionDate: '2026-03-20T00:00:00Z', addedByName: 'Ірина Коваль' },
  ],
};

const receiptsPayload = {
  items: [
    { id: 'r1', merchantName: 'Епіцентр', totalAmount: 54000, transactionDate: '2026-03-20T00:00:00Z', addedByName: 'Ірина Коваль' },
  ],
  page: 1,
  pageSize: 20,
  totalCount: 1,
};

test.describe('Public pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/public/organizations?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [orgPayload],
          page: 1,
          pageSize: 12,
          totalCount: 1,
        }),
      });
    });

    await page.route('**/api/public/organizations/promin', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(orgPayload) });
    });

    await page.route('**/api/public/organizations/promin/campaigns**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: campaignPayload.id,
              title: campaignPayload.title,
              description: campaignPayload.description,
              coverImageUrl: campaignPayload.coverImageUrl,
              goalAmount: campaignPayload.goalAmount,
              currentAmount: campaignPayload.currentAmount,
              status: 1,
              startDate: null,
              deadline: null,
              receiptCount: 1,
              organizationName: orgPayload.name,
              organizationSlug: orgPayload.slug,
            },
          ],
          page: 1,
          pageSize: 12,
          totalCount: 1,
        }),
      });
    });

    await page.route('**/api/public/organizations/promin/transparency', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalSpent: 188000,
          categories: [
            { name: 'Електроніка', amount: 120000, percentage: 64 },
            { name: 'Логістика', amount: 68000, percentage: 36 },
          ],
          monthlySpendings: [
            { month: '2026-02', amount: 88000 },
            { month: '2026-03', amount: 100000 },
          ],
          receiptCount: 12,
          verifiedReceiptCount: 12,
        }),
      });
    });

    await page.route('**/api/public/campaigns/camp-1', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(campaignPayload) });
    });

    await page.route('**/api/public/campaigns/camp-1/receipts**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(receiptsPayload) });
    });
  });

  test('TC-01: home page loads and shows organization grid', async ({ page }) => {
    test.info().annotations.push({ type: 'locale-check', description: 'Public pages load in bilingual-ready UI.' });

    await page.goto('/');

    await expect(page.getByTestId('home-hero-section')).toBeVisible();
    await expect(page.getByTestId('home-main-tabs')).toBeVisible();
    await expect(page.getByTestId('home-search-form')).toBeVisible();
    await expect(page.getByTestId('home-campaign-grid')).toBeVisible();
    await expect(page.getByTestId('home-campaign-card-link').first()).toBeVisible();
    await expect(page.getByTestId('home-campaign-org-link').first()).toBeVisible();
  });

  test('TC-02: home search and filters are interactive', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('home-search-input').fill('тепловізори');
    await page.getByTestId('home-campaign-verified-org-toggle').uncheck();
    await page.getByTestId('home-campaign-status-select').click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.getByRole('option', { name: /Активні|Active/i }).click();
    await page.getByTestId('home-search-submit-button').click();

    await expect(page.getByTestId('home-campaign-verified-org-toggle')).not.toBeChecked();
    await expect(page.getByTestId('home-campaign-grid')).toBeVisible();

    await page.getByTestId('home-main-tab-organizations').click();
    await expect(page.getByTestId('home-org-grid')).toBeVisible();

    await page.getByTestId('home-verified-filter-toggle').check();
    await page.getByTestId('home-active-filter-toggle').check();
    await expect(page.getByTestId('home-verified-filter-toggle')).toBeChecked();
    await expect(page.getByTestId('home-active-filter-toggle')).toBeChecked();
  });

  test('TC-03: organization page loads and tab switch works', async ({ page }) => {
    await page.goto('/o/promin');

    await expect(page.getByTestId('public-org-header')).toBeVisible();
    await expect(page.getByTestId('public-org-transparency-panel')).toBeVisible();
    await expect(page.getByTestId('public-org-campaign-tabs')).toBeVisible();

    await page.getByTestId('public-org-campaign-tab-active').click();
    await expect(page.getByTestId('public-org-campaign-list')).toBeVisible();
  });

  test('TC-04: campaign page loads and receipt link is visible', async ({ page }) => {
    await page.goto('/c/camp-1');

    await expect(page.getByTestId('public-campaign-header')).toBeVisible();
    await expect(page.getByTestId('public-campaign-progress-panel')).toBeVisible();
    await expect(page.getByTestId('public-campaign-description')).toBeVisible();
    await expect(page.getByTestId('public-campaign-receipts-list')).toBeVisible();
    await expect(page.getByTestId('public-campaign-receipt-link')).toBeVisible();
  });

  test('TC-05: public toolbar is visible across public routes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('public-page-toolbar')).toBeVisible();
    await expect(page.getByTestId('public-page-toolbar-entry-link')).toBeVisible();
    await expect(page.getByTestId('language-switcher-trigger')).toBeVisible();
    await expect(page.getByTestId('theme-toggle-trigger')).toBeVisible();

    await page.goto('/o/promin');
    await expect(page.getByTestId('public-page-toolbar')).toBeVisible();

    await page.goto('/c/camp-1');
    await expect(page.getByTestId('public-page-toolbar')).toBeVisible();

    await page.goto('/receipt/r1');
    await expect(page.getByTestId('public-page-toolbar')).toBeVisible();
    await expect(page.getByTestId('public-receipt-placeholder-page')).toBeVisible();
  });

  test('TC-06: login page contains link to public pages', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-public-pages-link')).toBeVisible();

    await page.getByTestId('login-public-pages-link').click();
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('home-hero-section')).toBeVisible();
  });
});
