import { test, expect } from './support/campaign-fixtures';

import en from '../src/i18n/locales/en.json' with { type: 'json' };
import uk from '../src/i18n/locales/uk.json' with { type: 'json' };

test.describe('Purchases Flow', () => {
  test.describe.configure({ timeout: 60_000 });

  test('TC-01: org-level purchases page loads with filters and create controls', async ({ page, campaignApi, campaignSeed }) => {
    test.info().annotations.push({
      type: 'description',
      description: `Locale keys available: ${Boolean(uk.purchases?.listTitle) && Boolean(en.purchases?.listTitle)}`,
    });

    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Закупівлі UI ${Date.now()}`,
      titleEn: `Purchases UI ${Date.now()}`,
      goalAmount: 10_000,
    });

    await page.goto(`/dashboard/${campaignSeed.orgId}/purchases?campaignId=${campaign.id}`);

    await expect(page.getByTestId('organization-purchases-page')).toBeVisible();
    await expect(page.getByTestId('organization-purchases-status-filter-trigger')).toBeVisible();
    await expect(page.getByTestId('organization-purchases-open-create-dialog')).toBeVisible();
  });

  test('TC-02: create purchase dialog opens and required fields are interactive', async ({ page, campaignApi, campaignSeed }) => {
    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Закупівлі Діалог ${Date.now()}`,
      titleEn: `Purchases Dialog ${Date.now()}`,
      goalAmount: 12_000,
    });

    await page.goto(`/dashboard/${campaignSeed.orgId}/purchases?campaignId=${campaign.id}`);

    await page.getByTestId('organization-purchases-open-create-dialog').click();
    await expect(page.getByTestId('organization-purchases-create-dialog')).toBeVisible();

    await page.getByTestId('organization-purchases-create-title-input').fill('Тестова закупівля');
    await page.getByTestId('organization-purchases-create-amount-input').fill('2500');

    await expect(page.getByTestId('organization-purchases-create-submit-button')).toBeEnabled();
  });

  test('TC-03: purchase detail (new) page exposes core form actions', async ({ page, campaignApi, campaignSeed }) => {
    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Закупівлі Деталі ${Date.now()}`,
      titleEn: `Purchases Detail ${Date.now()}`,
      goalAmount: 14_000,
    });

    await page.goto(`/dashboard/${campaignSeed.orgId}/campaigns/${campaign.id}/purchases/new`);

    await expect(page.getByTestId('purchase-detail-page')).toBeVisible();
    await expect(page.getByTestId('purchase-detail-title-input')).toBeVisible();
    await expect(page.getByTestId('purchase-detail-total-amount-input')).toBeVisible();
    await expect(page.getByTestId('purchase-detail-save-button')).toBeVisible();
  });

  test('TC-04: public campaign page shows spending tab and spending panel shell', async ({ page, campaignApi, campaignSeed }) => {
    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Публічні витрати ${Date.now()}`,
      titleEn: `Public spending ${Date.now()}`,
      goalAmount: 20_000,
    });

    await campaignApi.activateCampaign(campaign.id);
    await page.goto(`/c/${campaign.id}`);

    await expect(page.getByTestId('public-campaign-main-tabs')).toBeVisible();
    await page.getByTestId('public-campaign-tab-spending').click();

    await expect(page.getByTestId('public-campaign-panel-spending')).toBeVisible();
    await expect(page.getByTestId('public-campaign-spending-card')).toBeVisible();
  });

  test('TC-05: purchase detail shows three document blocks and OCR controls shell', async ({ page, campaignApi, campaignSeed }) => {
    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Плейсхолдери закупівлі ${Date.now()}`,
      titleEn: `Purchases placeholders ${Date.now()}`,
      goalAmount: 18_000,
    });

    await page.goto(`/dashboard/${campaignSeed.orgId}/purchases?campaignId=${campaign.id}`);
    await page.getByTestId('organization-purchases-open-create-dialog').click();
    await page.getByTestId('organization-purchases-create-title-input').fill('Покупка для OCR');
    await page.getByTestId('organization-purchases-create-amount-input').fill('1000');
    await page.getByTestId('organization-purchases-create-submit-button').click();

    await expect(page.getByTestId('purchase-detail-page')).toBeVisible();
    await expect(page.getByTestId('purchase-detail-ai-extract-panel')).toBeVisible();
    await expect(page.getByTestId('purchase-detail-ai-extract-button')).toBeDisabled();
    await expect(page.getByTestId('purchase-documents-receipts-dropzone')).toBeVisible();
    await expect(page.getByTestId('purchase-documents-waybills-dropzone')).toBeVisible();
    await expect(page.getByTestId('purchase-documents-transfer-dropzone')).toBeVisible();
  });
});
