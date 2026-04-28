import path from "path";
import { fileURLToPath } from "url";
import { test, expect } from "./support/campaign-fixtures";

import en from "../src/i18n/locales/en.json" with { type: "json" };
import uk from "../src/i18n/locales/uk.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  test("TC-06: upload bank receipt and run OCR processing", async ({
    page,
    campaignApi,
    campaignSeed,
    organizationPurchasesPage,
    purchaseDetailPage,
  }) => {
    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `OCR Тест ${Date.now()}`,
      goalAmount: 50_000,
    });

    // 1. Go to purchases list and create a new purchase
    await organizationPurchasesPage.goto(campaignSeed.orgId, campaign.id);
    await organizationPurchasesPage.openCreatePurchase();

    // 2. Save the purchase draft first (required to enable uploads)
    await purchaseDetailPage.fillTitle("Purchase for OCR Verification");
    await purchaseDetailPage.save();

    // Wait for navigation and detail page load
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/${campaignSeed.orgId}/purchases/[a-z0-9-]+$`),
    );
    await expect(purchaseDetailPage.receiptsDropzone).toBeVisible();

    // 3. Upload a document
    const testFilePath = path.resolve(__dirname, "../public/favicon-32x32.png");
    await purchaseDetailPage.uploadReceipt(testFilePath);

    // Wait for OCR button to appear (document uploaded)
    const ocrButton = page.getByTestId(/^purchase-document-ocr-button-/).first();
    await expect(ocrButton).toBeVisible();

    // Get the docId from the testid
    const testId = await ocrButton.getAttribute("data-testid");
    const docId = testId?.replace("purchase-document-ocr-button-", "");

    if (!docId)
      throw new Error("Could not find document ID from OCR button testid");

    // 4. Trigger OCR
    await ocrButton.click();

    // Wait for OCR to complete (synchronize with backend)
    await expect(purchaseDetailPage.getToastByText(/Документ розпізнано/i)).toBeVisible({ timeout: 15000 });

    // 5. Verify metadata fields (Stub data from StubDocumentOcrService)
    // The fields should populate automatically because of our useEffect fix
    const metadataForm = purchaseDetailPage.metadataForm(docId);
    await expect(metadataForm).toBeVisible();

    // Check EDRPOU (stub returns "12345678")
    await expect(purchaseDetailPage.edrpouInput(docId)).toHaveValue("12345678");

    // Check Payer (stub returns "Ivanov Ivan")
    await expect(purchaseDetailPage.payerInput(docId)).toHaveValue("Ivanov Ivan");

    // Check Amount (stub returns 123.45)
    await expect(purchaseDetailPage.amountInput(docId)).toHaveValue("123.45");

    // Check Counterparty (stub returns "OCR Stub Counterparty")
    await expect(purchaseDetailPage.counterpartyInput(docId)).toHaveValue(
      "OCR Stub Counterparty",
    );

    // Check Receipt Code
    await expect(purchaseDetailPage.receiptCodeInput(docId)).toHaveValue(
      "RC-999-000",
    );

    // Check Payment Purpose
    await expect(purchaseDetailPage.paymentPurposeInput(docId)).toHaveValue(
      "Payment for services",
    );

    // Check Sender IBAN
    await expect(purchaseDetailPage.senderIbanInput(docId)).toHaveValue(
      "UA112233440000012345678901234",
    );

    // Check Receiver IBAN
    await expect(purchaseDetailPage.receiverIbanInput(docId)).toHaveValue(
      "UA443322110000098765432109876",
    );

    // 6. Save metadata
    await purchaseDetailPage.saveMetadata(docId);

    // Expect success toast
    await expect(purchaseDetailPage.getToastByText(/оновлено/i)).toBeVisible();
  });

  test('TC-07: Should upload waybill and verify OCR items extraction', async ({
    page,
    campaignApi,
    campaignSeed,
    organizationPurchasesPage,
    purchaseDetailPage,
  }) => {
    // 1. Setup: Create campaign via API
    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Waybill Test Campaign ${Date.now()}`,
    });

    // 2. Navigate to purchases list and create a new purchase draft
    await organizationPurchasesPage.goto(campaignSeed.orgId, campaign.id);
    await organizationPurchasesPage.openCreatePurchase();

    await purchaseDetailPage.fillTitle("Waybill Purchase for OCR");
    await purchaseDetailPage.save();

    // Wait for navigation and detail page load
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/${campaignSeed.orgId}/purchases/[a-z0-9-]+$`),
    );

    // 3. Upload waybill
    const testFilePath = path.resolve(__dirname, "../public/favicon-32x32.png"); // Use any file, stub handles it
    await purchaseDetailPage.uploadWaybill(testFilePath);

    // Wait for upload to finish
    await expect(purchaseDetailPage.getToastByText(/Документ завантажено/i)).toBeVisible();
    
    // Get document ID from the OCR button
    const ocrButton = page.getByTestId(/^purchase-document-ocr-button-/).first();
    await expect(ocrButton).toBeVisible();
    const docId = (await ocrButton.getAttribute('data-testid'))?.replace('purchase-document-ocr-button-', '');
    if (!docId) throw new Error("Could not find document ID on OCR button");

    // 4. Run OCR
    await purchaseDetailPage.runOcr(docId);

    // Wait for OCR to complete (synchronize with backend)
    await expect(purchaseDetailPage.getToastByText(/Документ розпізнано/i)).toBeVisible({ timeout: 15000 });

    // 5. Verify metadata fields and items (Stub data from StubDocumentOcrService)
    // Counterparty
    await expect(purchaseDetailPage.counterpartyInput(docId)).toHaveValue('OCR Stub Counterparty');
    
    // Document amount (1550.00 from stub)
    await expect(purchaseDetailPage.amountInput(docId)).toHaveValue('1550.00');

    // Verify items list via POM
    const itemsList = purchaseDetailPage.itemsList(docId);
    await expect(itemsList).toBeVisible();

    // Verification of items (robust detection of which row is which)
    const row0 = itemsList.locator('[data-testid^="purchase-document-item-row-"]').nth(0);
    const row1 = itemsList.locator('[data-testid^="purchase-document-item-row-"]').nth(1);
    
    // Check name of first row to determine order
    const firstRowName = await row0.locator('input').nth(0).inputValue();
    const [rowItem1, rowItem2] = firstRowName.includes('Stub Item 1') ? [row0, row1] : [row1, row0];

    // "Stub Item 1": qty 10.5, price 100, total 1050
    await expect(rowItem1.locator('input').nth(0)).toHaveValue(/Stub Item 1/i);
    await expect(rowItem1.locator('input').nth(1)).toHaveValue('10.5');
    await expect(rowItem1.locator('input').nth(2)).toHaveValue('100');
    await expect(rowItem1.getByText('1050.00 ₴')).toBeVisible();

    // "Stub Item 2": qty 1, price 500, total 500
    await expect(rowItem2.locator('input').nth(0)).toHaveValue(/Stub Item 2/i);
    await expect(rowItem2.locator('input').nth(1)).toHaveValue('1');
    await expect(rowItem2.locator('input').nth(2)).toHaveValue('500');
    await expect(rowItem2.getByText('500.00 ₴')).toBeVisible();

    // 6. Save metadata
    await purchaseDetailPage.saveMetadata(docId);

    // Expect success toast
    await expect(purchaseDetailPage.getToastByText(/оновлено/i)).toBeVisible();
  });
});
