import { test, expect } from './support/fixtures';
import { loginViaApi, setAuthStorage, type AuthResponse } from './support/e2e-auth';

const VALID_EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'Qwerty-1';

test.describe('Admin campaign categories page', () => {
  let adminAuth: AuthResponse;

  test.beforeAll(async ({ request }) => {
    const auth = await loginViaApi(request, VALID_EMAIL, VALID_PASSWORD);
    adminAuth = {
      ...auth,
      user: {
        ...auth.user,
        roles: ['Admin'],
      },
    };
  });

  test.beforeEach(async ({ page }) => {
    await setAuthStorage(page, adminAuth);
    await page.goto('/admin/campaign-categories');
  });

  test('page loads basic shell', async ({ page }) => {
    await expect(page.getByTestId('admin-campaign-categories-page')).toBeVisible();
    await expect(page.getByTestId('admin-campaign-categories-title')).toBeVisible();
    await expect(page.getByTestId('admin-campaign-categories-table-title')).toBeVisible();
  });

  test('admin can create and delete campaign category', async ({ page }) => {
    const suffix = Date.now();
    const nameUk = `Тест категорія ${suffix}`;
    const nameEn = `Test Category ${suffix}`;
    const slug = `test-category-${suffix}`;

    await page.getByTestId('admin-campaign-categories-name-uk-input').fill(nameUk);
    await page.getByTestId('admin-campaign-categories-name-en-input').fill(nameEn);
    await page.getByTestId('admin-campaign-categories-slug-input').fill(slug);

    const createResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/admin/campaign-categories') && response.request().method() === 'POST',
    );

    await page.getByTestId('admin-campaign-categories-submit-button').click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBeTruthy();

    const row = page.getByTestId(`admin-campaign-categories-row-${slug}`);
    await expect(row).toBeVisible();

    const deleteResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/admin/campaign-categories/') && response.request().method() === 'DELETE',
    );

    await page.getByTestId(`admin-campaign-categories-delete-${slug}`).click();
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.ok()).toBeTruthy();
    await expect(row).toHaveCount(0);
  });
});
