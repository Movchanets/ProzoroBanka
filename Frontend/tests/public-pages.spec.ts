import { test, expect } from './support/fixtures';
import { setupPublicPagesMocks } from './support/public-mocks';

test.describe('Public pages', () => {
  test.beforeEach(async ({ page }) => {
    await setupPublicPagesMocks(page);
  });

  test('TC-01: home page loads and shows campaign grid', async ({ homePage }) => {
    test.info().annotations.push({ type: 'locale-check', description: 'Public pages load in bilingual-ready UI.' });

    await homePage.goto();

    await expect(homePage.heroSection).toBeVisible();
    await expect(homePage.mainTabs).toBeVisible();
    await expect(homePage.searchForm).toBeVisible();
    await expect(homePage.campaignGrid).toBeVisible();
    await expect(homePage.campaignCardLink.first()).toBeVisible();
    await expect(homePage.campaignOrgLink.first()).toBeVisible();
  });

  test('TC-02: home search and filters are interactive', async ({ page, homePage }) => {
    await homePage.goto();

    await homePage.fillSearch('тепловізори');
    await homePage.toggleVerifiedOrg(false);
    await homePage.selectStatus(/Активні|Active/i);
    await homePage.selectCategory(/Тепловізори|Thermal/i);
    await homePage.submitSearchAndWait();

    await expect(homePage.verifiedOrgToggle).not.toBeChecked();
    await expect(homePage.campaignCategorySelect).toBeVisible();
    await expect(homePage.campaignGrid).toBeVisible();
    await expect(homePage.campaignCardLink.first()).toBeVisible();
    await expect(page.getByText(/тепловізори/i).first()).toBeVisible();

    await homePage.clickOrganizationsTab();
    await expect(homePage.orgGrid).toBeVisible();

    await homePage.verifiedFilterToggle.check();
    await homePage.activeFilterToggle.check();
    await expect(homePage.verifiedFilterToggle).toBeChecked();
    await expect(homePage.activeFilterToggle).toBeChecked();
  });

  test('TC-03: organization page loads and tab switch works', async ({ orgPublicPage }) => {
    await orgPublicPage.goto('promin');

    await expect(orgPublicPage.header).toBeVisible();
    await expect(orgPublicPage.transparencyPanel).toBeVisible();
    await expect(orgPublicPage.transparencyCategoryElectronics).toBeVisible();
    await expect(orgPublicPage.transparencyCategoryLogistics).toBeVisible();
    await expect(orgPublicPage.monthlyList).toBeVisible();
    await expect(orgPublicPage.month2026_02).toBeVisible();
    await expect(orgPublicPage.month2026_03).toBeVisible();
    await expect(orgPublicPage.campaignTabs).toBeVisible();

    await orgPublicPage.clickActiveTab();
    await expect(orgPublicPage.campaignList).toBeVisible();
  });

  test('TC-04: campaign page loads and receipt link is visible', async ({ campaignPublicPage }) => {
    await campaignPublicPage.goto('camp-1');

    await expect(campaignPublicPage.header).toBeVisible();
    await expect(campaignPublicPage.progressPanel).toBeVisible();
    await expect(campaignPublicPage.description).toBeVisible();
    await expect(campaignPublicPage.receiptsList).toBeVisible();
    await expect(campaignPublicPage.receiptLink).toBeVisible();
  });

  test('TC-04A: navigation from campaign receipt to receipt page works', async ({ page, campaignPublicPage, receiptPublicPage }) => {
    await campaignPublicPage.goto('camp-1');

    await expect(campaignPublicPage.receiptLink).toBeVisible();
    await campaignPublicPage.clickFirstReceipt();

    await expect(page).toHaveURL(/\/receipt\//);
    await expect(receiptPublicPage.receiptPage).toBeVisible();
    await expect(receiptPublicPage.image).toBeVisible();
    await expect(receiptPublicPage.itemsCard).toBeVisible();
    await expect(receiptPublicPage.photosGrid).toBeVisible();
    await expect(receiptPublicPage.photoItemDescription).toContainText(/Товар:|Item:/);
  });

  test('TC-05: public toolbar is visible across public routes', async ({ homePage, orgPublicPage, campaignPublicPage, receiptPublicPage, publicLayout }) => {
    await homePage.goto();
    await expect(publicLayout.toolbar).toBeVisible();
    await expect(publicLayout.toolbarEntryLink).toBeVisible();
    await expect(publicLayout.languageSwitcher).toBeVisible();
    await expect(publicLayout.themeToggle).toBeVisible();

    await orgPublicPage.goto('promin');
    await expect(publicLayout.toolbar).toBeVisible();

    await campaignPublicPage.goto('camp-1');
    await expect(publicLayout.toolbar).toBeVisible();

    await receiptPublicPage.goto('r1');
    await expect(publicLayout.toolbar).toBeVisible();
    await expect(receiptPublicPage.receiptPage).toBeVisible();
    await expect(receiptPublicPage.image).toBeVisible();
    await expect(receiptPublicPage.itemsCard).toBeVisible();
    await expect(receiptPublicPage.photosGrid).toBeVisible();
  });

  test('TC-06: login page contains link to public pages', async ({ page, loginPage, homePage }) => {
    await loginPage.goto();
    await expect(loginPage.publicPagesLink).toBeVisible();

    await loginPage.publicPagesLink.click();

    await expect(page).toHaveURL('/');
    await expect(homePage.heroSection).toBeVisible();
  });
});
