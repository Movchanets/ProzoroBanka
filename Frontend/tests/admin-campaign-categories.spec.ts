import { test, expect } from "./support/fixtures";
import {
  getSeededAdminCredentials,
  loginViaApi,
  setAuthStorage,
  type AuthResponse,
} from "./support/e2e-auth";

const seededAdmin = getSeededAdminCredentials();

test.describe("Admin campaign categories page", () => {
  let adminAuth: AuthResponse;

  test.beforeAll(async ({ request }) => {
    const auth = await loginViaApi(
      request,
      seededAdmin.email,
      seededAdmin.password,
    );
    adminAuth = {
      ...auth,
      user: {
        ...auth.user,
        roles: ["Admin"],
      },
    };
  });

  test.beforeEach(async ({ page, adminCampaignCategoriesPage }) => {
    await setAuthStorage(page, adminAuth);
    await adminCampaignCategoriesPage.goto();
  });

  test("page loads basic shell", async ({ adminCampaignCategoriesPage }) => {
    await expect(adminCampaignCategoriesPage.pageContainer).toBeVisible();
    await expect(adminCampaignCategoriesPage.title).toBeVisible();
    await expect(adminCampaignCategoriesPage.tableTitle).toBeVisible();
  });

  test("admin can create and delete campaign category", async ({
    adminCampaignCategoriesPage,
  }) => {
    const suffix = Date.now();
    const nameUk = `Тест категорія ${suffix}`;
    const nameEn = `Test Category ${suffix}`;
    const slug = `test-category-${suffix}`;

    await adminCampaignCategoriesPage.fillCategory(nameUk, nameEn, slug);

    const createResponse =
      await adminCampaignCategoriesPage.submitAndWaitForCreate();
    expect(createResponse.ok()).toBeTruthy();

    const row = adminCampaignCategoriesPage.getRow(slug);
    await expect(row).toBeVisible();

    const deleteResponse =
      await adminCampaignCategoriesPage.deleteAndWaitForResponse(slug);
    expect(deleteResponse.ok()).toBeTruthy();
    await expect(row).toHaveCount(0);
  });
});
