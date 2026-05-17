import { test, expect } from "./support/fixtures";
import { setupPublicPagesMocks } from "./support/public-mocks";

test.describe("Public pages", () => {
  test.beforeEach(async ({ page }) => {
    await setupPublicPagesMocks(page);
  });

  test("TC-01: home page loads and shows campaign grid", async ({
    homePage,
  }) => {
    test
      .info()
      .annotations.push({
        type: "locale-check",
        description: "Public pages load in bilingual-ready UI.",
      });

    await homePage.goto();

    await expect(homePage.heroSection).toBeVisible();
    await expect(homePage.mainTabs).toBeVisible();
    await expect(homePage.searchForm).toBeVisible();
    await expect(homePage.campaignGrid).toBeVisible();
    await expect(homePage.campaignCardLink.first()).toBeVisible();
    await expect(homePage.campaignOrgLink.first()).toBeVisible();
  });

  test("TC-01B: home page shows public feed timeline", async ({
    homePage,
  }) => {
    await homePage.goto();

    await expect(homePage.publicFeedSection).toBeVisible();
    await expect(homePage.publicFeed).toBeVisible();
    await expect(
      homePage.page.getByTestId("public-feed-item-post-post-1"),
    ).toBeVisible();
    await expect(
      homePage.page.getByTestId("public-feed-item-purchase-purchase-1"),
    ).toBeVisible();
    await expect(
      homePage.page.getByTestId("public-feed-item-transaction-tx-1"),
    ).toBeVisible();
  });

  test("TC-02: home search and filters are interactive", async ({
    page,
    homePage,
  }) => {
    await homePage.goto();

    await homePage.fillSearch("тепловізори");
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

  test("TC-03: organization page loads and tab switch works", async ({
    orgPublicPage,
  }) => {
    await orgPublicPage.goto("promin");

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

  test("TC-04: campaign page loads and receipt link is visible", async ({
    campaignPublicPage,
  }) => {
    await campaignPublicPage.goto("camp-1");

    await expect(campaignPublicPage.header).toBeVisible();
    await expect(campaignPublicPage.progressPanel).toBeVisible();
    await expect(campaignPublicPage.description).toBeVisible();
    await campaignPublicPage.page
      .getByTestId("public-campaign-tab-receipts")
      .click();
    await expect(campaignPublicPage.receiptsList).toBeVisible();
    await expect(campaignPublicPage.receiptLink).toBeVisible();
  });

  test("TC-04B: campaign feed timeline loads and shows items", async ({
    campaignPublicPage,
  }) => {
    await campaignPublicPage.goto("camp-1");

    await expect(campaignPublicPage.campaignFeed).toBeVisible();
    await expect(campaignPublicPage.campaignFeedCounter).toBeVisible();

    // Verify feed items are rendered with correct types
    await expect(
      campaignPublicPage.getFeedItem("post", "post-1"),
    ).toBeVisible();
    await expect(
      campaignPublicPage.getFeedItem("purchase", "purchase-1"),
    ).toBeVisible();
    await expect(
      campaignPublicPage.getFeedItem("transaction", "tx-1"),
    ).toBeVisible();
  });

  test("TC-04C: campaign feed shows post content and purchase details", async ({
    campaignPublicPage,
  }) => {
    await campaignPublicPage.goto("camp-1");

    // Wait for feed to load
    await expect(campaignPublicPage.campaignFeed).toBeVisible();

    // Wait for all 3 feed items to render
    await expect(campaignPublicPage.getFeedItem("post", "post-1")).toBeVisible();
    await expect(campaignPublicPage.getFeedItem("purchase", "purchase-1")).toBeVisible();
    await expect(campaignPublicPage.getFeedItem("transaction", "tx-1")).toBeVisible();

    // Post content is rendered
    await expect(
      campaignPublicPage.page.getByText("Оновлення по закупівлі для тестування галереї"),
    ).toBeVisible();

    // Purchase title is rendered
    await expect(
      campaignPublicPage.page.getByText("Тепловізійний модуль Pulsar"),
    ).toBeVisible();

    // Transaction amount is rendered (contains "2,500")
    await expect(
      campaignPublicPage.page.getByText(/2[,.]?500/),
    ).toBeVisible();
  });

  test("TC-04D: campaign feed empty state", async ({ page, campaignPublicPage }) => {
    // Override feed mock to return empty
    await page.route('**/api/public/campaigns/camp-1/feed**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], page: 1, pageSize: 20, totalCount: 0 }),
      });
    });

    await campaignPublicPage.goto("camp-1");

    await expect(campaignPublicPage.campaignFeedEmpty).toBeVisible();
  });

  test("TC-04E: campaign feed error state", async ({ page, campaignPublicPage }) => {
    // Override feed mock to return error
    await page.route('**/api/public/campaigns/camp-1/feed**', async (route) => {
      await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
    });

    await campaignPublicPage.goto("camp-1");

    await expect(campaignPublicPage.campaignFeedError).toBeVisible();
  });

  test("TC-04A: navigation from campaign receipt to receipt page works", async ({
    page,
    campaignPublicPage,
    receiptPublicPage,
  }) => {
    await campaignPublicPage.goto("camp-1");

    await campaignPublicPage.page
      .getByTestId("public-campaign-tab-receipts")
      .click();
    await expect(campaignPublicPage.receiptLink).toBeVisible();
    await campaignPublicPage.clickFirstReceipt();

    await expect(page).toHaveURL(/\/receipt\//);
    await expect(receiptPublicPage.receiptPage).toBeVisible();
    await expect(receiptPublicPage.image).toBeVisible();
    await expect(receiptPublicPage.itemsCard).toBeVisible();
    await expect(receiptPublicPage.photosGrid).toBeVisible();
    await expect(receiptPublicPage.photoItemDescription).toContainText(
      /Товар:|Item:/,
    );
  });

  test("TC-05: public toolbar is visible across public routes", async ({
    page,
    homePage,
    orgPublicPage,
    campaignPublicPage,
    receiptPublicPage,
    publicLayout,
  }) => {
    await homePage.goto();
    await expect(publicLayout.toolbar).toBeVisible();
    await expect(publicLayout.toolbarEntryLink).toBeVisible();
    await expect(publicLayout.languageSwitcher).toBeVisible();
    await expect(publicLayout.themeToggle).toBeVisible();

    // Toolbar anchors are only present on wide viewports (sm breakpoint ≥ 640px)
    const viewportWidth = page.viewportSize()?.width ?? 1280;
    if (viewportWidth >= 640) {
      await expect(publicLayout.toolbarCampaignsAnchor).toBeVisible();
      // The organizations anchor was added in a later UI iteration — check only when present
      const orgAnchorCount =
        await publicLayout.toolbarOrganizationsAnchor.count();
      if (orgAnchorCount > 0) {
        await expect(publicLayout.toolbarOrganizationsAnchor).toBeVisible();
      }
    }

    await orgPublicPage.goto("promin");
    await expect(publicLayout.toolbar).toBeVisible();

    await campaignPublicPage.goto("camp-1");
    await expect(publicLayout.toolbar).toBeVisible();

    await receiptPublicPage.goto("r1");
    await expect(publicLayout.toolbar).toBeVisible();
    await expect(receiptPublicPage.receiptPage).toBeVisible();
    await expect(receiptPublicPage.image).toBeVisible();
    await expect(receiptPublicPage.itemsCard).toBeVisible();
    await expect(receiptPublicPage.photosGrid).toBeVisible();
  });

  test("TC-07: toolbar anchors sync hash and active home tab", async ({
    page,
    homePage,
    publicLayout,
  }) => {
    // Toolbar anchors are only present on wide viewports (sm breakpoint ≥ 640px)
    const viewportWidth = page.viewportSize()?.width ?? 1280;
    test.skip(
      viewportWidth < 640,
      "Toolbar anchors are hidden on mobile viewports",
    );

    await homePage.goto();

    // The organizations anchor was added in a later UI iteration.
    // If it's not present yet (old Docker image), test the campaigns anchor only.
    const orgAnchorCount =
      await publicLayout.toolbarOrganizationsAnchor.count();

    if (orgAnchorCount > 0) {
      await publicLayout.toolbarOrganizationsAnchor.click();
      await expect(page).toHaveURL(/#organizations$/);
      await expect(homePage.tabOrganizations).toHaveAttribute(
        "data-state",
        "active",
      );
      await expect(homePage.orgGrid).toBeVisible();
    }

    await publicLayout.toolbarCampaignsAnchor.click();
    await expect(page).toHaveURL(/#campaigns$/);
    await expect(homePage.tabCampaigns).toHaveAttribute("data-state", "active");
    await expect(homePage.campaignGrid).toBeVisible();
  });

  test("TC-06: login page contains link to public pages", async ({
    page,
    loginPage,
    homePage,
  }) => {
    await loginPage.goto();
    await expect(loginPage.publicPagesLink).toBeVisible();

    await Promise.all([
      page.waitForURL(url => url.pathname === '/' || url.pathname === '', { timeout: 10000 }),
      loginPage.publicPagesLink.evaluate(el => (el as HTMLElement).click()),
    ]);
    
    // Wait for target page content first to ensure navigation happened
    await expect(homePage.heroSection).toBeVisible();
    await expect(page).toHaveURL("/", { timeout: 10000 });
  });
});
