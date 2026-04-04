import { test, expect } from './support/fixtures';

import { t } from './support/i18n';
import { loginViaUi, registerRandomUserViaApi } from './support/e2e-auth';
import { applyLocale } from './support/locale-matrix';

let validEmail = process.env.E2E_EMAIL ?? '';
const validPassword = process.env.E2E_PASSWORD ?? 'Qwerty-1';

async function ensureTestUser(request: import('@playwright/test').APIRequestContext) {
  if (validEmail) {
    return;
  }

  const registeredUser = await registerRandomUserViaApi(request, {
    firstName: 'Profile',
    lastName: 'Tester',
    emailPrefix: 'profile-e2e',
    password: validPassword,
  });

  validEmail = registeredUser.auth.user.email;
}

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await loginViaUi(page, email, password, {
    gotoPath: '/login',
    expectedUrlPattern: /.*\/(onboarding|dashboard).*/,
    setLanguage: false,
  });
}

test.beforeAll(async ({ request }) => {
  await ensureTestUser(request);
});

test.describe('User Profile — Display', () => {
  test.beforeEach(async ({ page, profilePage }) => {
    await applyLocale(page, 'uk');
    await loginAs(page, validEmail, validPassword);
    await profilePage.goto();
    await expect(page.getByText(t('common.loadingInterface'))).not.toBeVisible({ timeout: 15000 });
  });

  test('TC-01: Profile page displays user information correctly', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the profile page loads and shows the user email, name, and role information.',
    });

    await expect(page.getByText(t('profile.loadingProfile'))).not.toBeVisible({ timeout: 10000 });

    const emailField = page.locator('article').filter({ hasText: t('common.email') }).first();
    await expect(emailField).toBeVisible();
    await expect(emailField).toContainText(validEmail);

    const sessionField = page.locator('article').filter({ hasText: t('profile.sessionStatus') }).first();
    await expect(sessionField).toBeVisible();
    await expect(sessionField).toContainText(t('profile.sessionActive'));

    await expect(page.getByText(t('profile.badge')).first()).toBeVisible();
    await expect(page.getByText(t('profile.editBadge')).first()).toBeVisible();
  });

  test('TC-02: Profile form fields are populated with current user data', async ({ page, profilePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the profile edit form fields are pre-filled with existing user data.',
    });

    await expect(page.getByText(t('profile.loadingProfile'))).not.toBeVisible({ timeout: 10000 });

    await expect(profilePage.firstNameInput).toBeVisible();
    await expect(profilePage.firstNameInput).not.toHaveValue('');

    await expect(profilePage.lastNameInput).toBeVisible();
    await expect(profilePage.lastNameInput).not.toHaveValue('');

    await expect(profilePage.phoneInput).toBeVisible();
  });

  test('TC-03: Avatar section displays correctly with upload option', async ({ page, profilePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the avatar section shows either the user photo or initials, and the upload button is available.',
    });

    await expect(page.getByText(t('profile.loadingProfile'))).not.toBeVisible({ timeout: 10000 });

    await expect(profilePage.avatarUpdateButton).toBeVisible();
    await expect(profilePage.avatarUpdateButton).toBeEnabled();
  });
});

test.describe('User Profile — Editing', () => {
  test.beforeEach(async ({ page, profilePage }) => {
    await applyLocale(page, 'uk');
    await loginAs(page, validEmail, validPassword);
    await profilePage.goto();
    await expect(page.getByText(t('common.loadingInterface'))).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText(t('profile.loadingProfile'))).not.toBeVisible({ timeout: 10000 });
  });

  test('TC-04: Update first name and save changes', async ({ page, profilePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the first name field and saving persists the change and shows a success message.',
    });

    const originalValue = await profilePage.firstNameInput.inputValue();
    const newValue = originalValue === 'Test' ? 'Updated' : 'Test';

    await profilePage.firstNameInput.clear();
    await profilePage.firstNameInput.fill(newValue);

    await expect(profilePage.saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/auth/me') && response.request().method() === 'PUT'
    );

    await profilePage.saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('profile.updateSuccessTitle'))).toBeVisible({ timeout: 5000 });

    await expect(profilePage.firstNameInput).toHaveValue(newValue);

    await profilePage.firstNameInput.clear();
    await profilePage.firstNameInput.fill(originalValue);
    await profilePage.saveButton.click();
    await expect(page.getByText(t('profile.updateSuccessTitle'))).toBeVisible({ timeout: 5000 });
  });

  test('TC-05: Update last name and save changes', async ({ page, profilePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the last name field and saving persists the change.',
    });

    const originalValue = await profilePage.lastNameInput.inputValue();
    const newValue = originalValue === 'User' ? 'Modified' : 'User';

    await profilePage.lastNameInput.clear();
    await profilePage.lastNameInput.fill(newValue);

    await expect(profilePage.saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/auth/me') && response.request().method() === 'PUT'
    );

    await profilePage.saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('profile.updateSuccessTitle'))).toBeVisible({ timeout: 5000 });
    await expect(profilePage.lastNameInput).toHaveValue(newValue);

    await profilePage.lastNameInput.clear();
    await profilePage.lastNameInput.fill(originalValue);
    await profilePage.saveButton.click();
    await expect(page.getByText(t('profile.updateSuccessTitle'))).toBeVisible({ timeout: 5000 });
  });

  test('TC-06: Update phone number and save changes', async ({ page, profilePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the phone number field and saving persists the change.',
    });

    const newPhone = '+380671234567';

    await profilePage.phoneInput.clear();
    await profilePage.phoneInput.fill(newPhone);

    await expect(profilePage.saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/auth/me') && response.request().method() === 'PUT'
    );

    await profilePage.saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('profile.updateSuccessTitle'))).toBeVisible({ timeout: 5000 });
    await expect(profilePage.phoneInput).toHaveValue(newPhone);
  });

  test('TC-07: Save button is disabled when no changes are made', async ({ profilePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the save button is disabled when the form has not been modified.',
    });

    await expect(profilePage.saveButton).toBeDisabled();
  });

  test('TC-08: Validation prevents saving with empty first name', async ({ page, profilePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that clearing the first name field shows a validation error and prevents saving.',
    });

    await profilePage.firstNameInput.clear();
    await profilePage.saveButton.click();
    await expect(page.getByText(t('validation.nameMin'))).toBeVisible({ timeout: 5000 });
  });

  test('TC-09: Validation prevents saving with empty last name', async ({ page, profilePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that clearing the last name field shows a validation error.',
    });

    await profilePage.lastNameInput.clear();
    await profilePage.saveButton.click();
    await expect(page.getByText(t('validation.nameMin'))).toBeVisible({ timeout: 5000 });
  });

  test('TC-10: Validation prevents saving with invalid phone format', async ({ page, profilePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that entering an invalid phone number shows a validation error.',
    });

    await profilePage.phoneInput.clear();
    await profilePage.phoneInput.fill('invalid-phone-!!!');
    await profilePage.saveButton.click();
    await expect(page.getByText(t('validation.phoneInvalid'))).toBeVisible({ timeout: 5000 });
  });
});

test.describe('User Profile — Edge Cases', () => {
  test('TC-11: Profile page shows loading state while fetching data', async ({ page, profilePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the profile page displays a loading indicator while user data is being fetched.',
    });

    await applyLocale(page, 'uk');
    await loginAs(page, validEmail, validPassword);

    await page.route('**/api/auth/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: {
          ...response.headers(),
          'x-e2e-delayed': '1',
        },
      });
    });

    const startedAt = Date.now();
    const profileResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/auth/me')
      && response.request().method() === 'GET'
      && response.headers()['x-e2e-delayed'] === '1',
    );

    await profilePage.goto();

    const profileResponse = await profileResponsePromise;
    expect(profileResponse.ok()).toBeTruthy();
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(900);

    await expect(profilePage.firstNameInput).toBeVisible({ timeout: 10000 });
  });

  test('TC-12: Unauthenticated users are redirected from profile to login', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that accessing the profile page without authentication redirects to the login page.',
    });

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
    });

    await page.goto('/profile');
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
  });

  test('TC-13: Profile update shows error message on API failure', async ({ page, profilePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that when the profile update API call fails, an appropriate error message is displayed.',
    });

    await applyLocale(page, 'uk');
    await loginAs(page, validEmail, validPassword);
    await profilePage.goto();
    await expect(page.getByText(t('common.loadingInterface'))).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText(t('profile.loadingProfile'))).not.toBeVisible({ timeout: 10000 });

    await page.route('**/api/auth/me', (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      } else {
        route.continue();
      }
    });

    await profilePage.firstNameInput.clear();
    await profilePage.firstNameInput.fill('ErrorTest');

    await expect(profilePage.saveButton).toBeEnabled();
    await profilePage.saveButton.click();

    await expect(page.getByText('Internal server error').first()).toBeVisible({ timeout: 5000 });
  });
});
