import { test, expect } from "./support/campaign-fixtures";

import en from "../src/i18n/locales/en.json" with { type: "json" };
import uk from "../src/i18n/locales/uk.json" with { type: "json" };

test.describe("Purchases Flow", () => {
  test.describe.configure({ timeout: 60_000 });

  test("TC-01: org-level purchases page loads with filters and create controls", async ({
    campaignApi,
    campaignSeed,
    organizationPurchasesPage,
  }) => {
    test.info().annotations.push({
      type: "description",
      description: `Locale keys available: ${Boolean(uk.purchases?.listTitle) && Boolean(en.purchases?.listTitle)}`,
    });

    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Закупівлі UI ${Date.now()}`,
      titleEn: `Purchases UI ${Date.now()}`,
      goalAmount: 10_000,
    });

    await organizationPurchasesPage.goto(campaignSeed.orgId, campaign.id);

    await expect(organizationPurchasesPage.pageContainer).toBeVisible();
    await expect(organizationPurchasesPage.statusFilterTrigger).toBeVisible();
    await expect(
      organizationPurchasesPage.openCreateDialogButton,
    ).toBeVisible();
  });

  test("TC-02: create purchase dialog opens and required fields are interactive", async ({
    page,
    campaignApi,
    campaignSeed,
    organizationPurchasesPage,
    purchaseDetailPage,
  }) => {
    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Закупівлі Діалог ${Date.now()}`,
      titleEn: `Purchases Dialog ${Date.now()}`,
      goalAmount: 12_000,
    });

    await organizationPurchasesPage.goto(campaignSeed.orgId, campaign.id);

    await organizationPurchasesPage.openCreatePurchase();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/${campaignSeed.orgId}/purchases/new$`),
    );
    await expect(purchaseDetailPage.pageContainer).toBeVisible();
    await expect(purchaseDetailPage.titleInput).toBeVisible();
    await expect(purchaseDetailPage.totalAmountDisplay).toBeVisible();
    await expect(purchaseDetailPage.saveButton).toBeEnabled();
  });

  test("TC-03: purchase detail (new) page exposes core form actions", async ({
    campaignApi,
    campaignSeed,
    purchaseDetailPage,
  }) => {
    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Закупівлі Деталі ${Date.now()}`,
      titleEn: `Purchases Detail ${Date.now()}`,
      goalAmount: 14_000,
    });

    await purchaseDetailPage.gotoNew(campaignSeed.orgId, campaign.id);

    await expect(purchaseDetailPage.pageContainer).toBeVisible();
    await expect(purchaseDetailPage.titleInput).toBeVisible();
    await expect(purchaseDetailPage.totalAmountDisplay).toBeVisible();
    await expect(purchaseDetailPage.saveButton).toBeVisible();
  });

  test("TC-04: public campaign page shows spending tab and spending panel shell", async ({
    campaignApi,
    campaignSeed,
    campaignPublicPage,
  }) => {
    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Публічні витрати ${Date.now()}`,
      titleEn: `Public spending ${Date.now()}`,
      goalAmount: 20_000,
    });

    await campaignApi.activateCampaign(campaign.id);
    await campaignPublicPage.goto(campaign.id);

    await expect(campaignPublicPage.publicCampaignMainTabs).toBeVisible();
    await campaignPublicPage.openSpendingTab();

    await expect(campaignPublicPage.publicCampaignPanelSpending).toBeVisible();
    await expect(campaignPublicPage.publicCampaignSpendingCard).toBeVisible();
  });

  test("TC-05: purchase detail shows three document blocks and OCR controls shell", async ({
    campaignApi,
    campaignSeed,
    organizationPurchasesPage,
    purchaseDetailPage,
  }) => {
    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Плейсхолдери закупівлі ${Date.now()}`,
      titleEn: `Purchases placeholders ${Date.now()}`,
      goalAmount: 18_000,
    });

    await organizationPurchasesPage.goto(campaignSeed.orgId, campaign.id);
    await organizationPurchasesPage.openCreatePurchase();
    await expect(purchaseDetailPage.pageContainer).toBeVisible();
    await purchaseDetailPage.fillTitle("Покупка для OCR");
    await purchaseDetailPage.save();

    await expect(purchaseDetailPage.pageContainer).toBeVisible();
    await expect(purchaseDetailPage.receiptsDropzone).toBeVisible();
    await expect(purchaseDetailPage.waybillsDropzone).toBeVisible();
    await expect(purchaseDetailPage.transferDropzone).toBeVisible();
  });
});
