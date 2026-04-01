import { expect, test } from '@playwright/test';
import { setupPublicPagesMocks } from './support/public-mocks';

test.describe('Public pages', () => {
  test.beforeEach(async ({ page }) => {
    await setupPublicPagesMocks(page);
  });

  test('TC-01: home page loads and shows campaign grid', async ({ page }) => {
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
    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/public/campaigns/search') && response.ok(),
      ),
      page.getByTestId('home-search-submit-button').click(),
    ]);

    await expect(page.getByTestId('home-campaign-verified-org-toggle')).not.toBeChecked();
    await expect(page.getByTestId('home-campaign-grid')).toBeVisible();
    await expect(page.getByTestId('home-campaign-card-link').first()).toBeVisible();
    await expect(page.getByText(/тепловізори/i).first()).toBeVisible();

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
    const publicPagesLink = page.getByTestId('login-public-pages-link');
    await expect(publicPagesLink).toBeVisible();

    const href = await publicPagesLink.getAttribute('href');
    await publicPagesLink.click({ force: true });
    if (href) {
      await page.goto(href);
    }

    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('home-hero-section')).toBeVisible();
  });
});
