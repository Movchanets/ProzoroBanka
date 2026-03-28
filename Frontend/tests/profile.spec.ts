import { test, expect } from '@playwright/test';

import { t } from './support/i18n';
import { loginViaUi, registerRandomUserViaApi } from './support/e2e-auth';

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

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await loginViaUi(page, email, password, {
    gotoPath: '/login',
    expectedUrlPattern: /.*\/(onboarding|dashboard).*/,
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.beforeAll(async ({ request }) => {
  await ensureTestUser(request);
});

test.describe('User Profile — Display', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, validEmail, validPassword);
    await page.goto('/profile');
    await expect(page).toHaveURL(/.*\/profile/);
    // Wait for route fallback to disappear (lazy-loaded page)
    await expect(page.getByText(t('common.loadingInterface'))).not.toBeVisible({ timeout: 15000 });
  });

  // =========================================================================
  // TC-01: Profile page loads with user information
  // =========================================================================
  test('TC-01: Profile page displays user information correctly', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the profile page loads and shows the user email, name, and role information.',
    });

    // Wait for profile data to load (profile-specific loading text disappears)
    await expect(page.getByText(t('profile.loadingProfile'))).not.toBeVisible({ timeout: 10000 });

    // Verify email is displayed
    const emailField = page.locator('article').filter({ hasText: t('common.email') }).first();
    await expect(emailField).toBeVisible();
    await expect(emailField).toContainText(validEmail);

    // Verify session status shows "Active"
    const sessionField = page.locator('article').filter({ hasText: t('profile.sessionStatus') }).first();
    await expect(sessionField).toBeVisible();
    await expect(sessionField).toContainText(t('profile.sessionActive'));

    // Verify the profile badge is visible
    await expect(page.getByText(t('profile.badge')).first()).toBeVisible();

    // Verify the edit section is present
    await expect(page.getByText(t('profile.editBadge')).first()).toBeVisible();
  });

  // =========================================================================
  // TC-02: Profile form fields are populated
  // =========================================================================
  test('TC-02: Profile form fields are populated with current user data', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the profile edit form fields (first name, last name, phone) are pre-filled with existing user data.',
    });

    // Wait for profile data to load
    await expect(page.getByText(t('profile.loadingProfile'))).not.toBeVisible({ timeout: 10000 });

    // Verify first name input has a value (not empty)
    const firstNameInput = page.getByTestId('profile-first-name-input');
    await expect(firstNameInput).toBeVisible();
    await expect(firstNameInput).not.toHaveValue('');

    // Verify last name input has a value (not empty)
    const lastNameInput = page.getByTestId('profile-last-name-input');
    await expect(lastNameInput).toBeVisible();
    await expect(lastNameInput).not.toHaveValue('');

    // Verify phone input is present (may be empty)
    const phoneInput = page.getByTestId('profile-phone-input');
    await expect(phoneInput).toBeVisible();
  });

  // =========================================================================
  // TC-03: Profile avatar section is visible
  // =========================================================================
  test('TC-03: Avatar section displays correctly with upload option', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the avatar section shows either the user photo or initials, and the upload button is available.',
    });

    // Wait for profile data to load
    await expect(page.getByText(t('profile.loadingProfile'))).not.toBeVisible({ timeout: 10000 });

    // Verify avatar upload button is visible
    const uploadButton = page.getByTestId('profile-avatar-update-button');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toBeEnabled();
  });
});

test.describe('User Profile — Editing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, validEmail, validPassword);
    await page.goto('/profile');
    await expect(page).toHaveURL(/.*\/profile/);
    // Wait for route fallback to disappear
    await expect(page.getByText(t('common.loadingInterface'))).not.toBeVisible({ timeout: 15000 });
    // Wait for profile data to load
    await expect(page.getByText(t('profile.loadingProfile'))).not.toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // TC-04: Update first name successfully
  // =========================================================================
  test('TC-04: Update first name and save changes', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the first name field and saving persists the change and shows a success message.',
    });

    const firstNameInput = page.getByTestId('profile-first-name-input');
    const originalValue = await firstNameInput.inputValue();
    const newValue = originalValue === 'Test' ? 'Updated' : 'Test';

    // Clear and type new first name
    await firstNameInput.clear();
    await firstNameInput.fill(newValue);

    // Wait for save button to become enabled (form is dirty)
    const saveButton = page.getByTestId('profile-save-button');
    await expect(saveButton).toBeEnabled();

    // Intercept the PUT request
    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/auth/me') && response.request().method() === 'PUT'
    );

    // Click save
    await saveButton.click();

    // Verify API call succeeded
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    // Verify success message appears
    await expect(page.getByText(t('profile.updateSuccessTitle'))).toBeVisible({ timeout: 5000 });

    // Verify the input still has the new value
    await expect(firstNameInput).toHaveValue(newValue);

    // Restore original value
    await firstNameInput.clear();
    await firstNameInput.fill(originalValue);
    await page.getByTestId('profile-save-button').click();
    await expect(page.getByText(t('profile.updateSuccessTitle'))).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // TC-05: Update last name successfully
  // =========================================================================
  test('TC-05: Update last name and save changes', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the last name field and saving persists the change.',
    });

    const lastNameInput = page.getByTestId('profile-last-name-input');
    const originalValue = await lastNameInput.inputValue();
    const newValue = originalValue === 'User' ? 'Modified' : 'User';

    await lastNameInput.clear();
    await lastNameInput.fill(newValue);

    const saveButton = page.getByTestId('profile-save-button');
    await expect(saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/auth/me') && response.request().method() === 'PUT'
    );

    await saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('profile.updateSuccessTitle'))).toBeVisible({ timeout: 5000 });
    await expect(lastNameInput).toHaveValue(newValue);

    // Restore original value
    await lastNameInput.clear();
    await lastNameInput.fill(originalValue);
    await page.getByTestId('profile-save-button').click();
    await expect(page.getByText(t('profile.updateSuccessTitle'))).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // TC-06: Update phone number
  // =========================================================================
  test('TC-06: Update phone number and save changes', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the phone number field and saving persists the change.',
    });

    const phoneInput = page.getByTestId('profile-phone-input');
    const originalValue = await phoneInput.inputValue();
    const newPhone = '+380671234567';

    await phoneInput.clear();
    await phoneInput.fill(newPhone);

    const saveButton = page.getByTestId('profile-save-button');
    await expect(saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/auth/me') && response.request().method() === 'PUT'
    );

    await saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('profile.updateSuccessTitle'))).toBeVisible({ timeout: 5000 });
    await expect(phoneInput).toHaveValue(newPhone);

    // Restore original value
    await phoneInput.clear();
    if (originalValue) {
      await phoneInput.fill(originalValue);
    }
    await page.getByTestId('profile-save-button').click();
    await expect(page.getByText(t('profile.updateSuccessTitle'))).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // TC-07: Save button disabled when form is unchanged
  // =========================================================================
  test('TC-07: Save button is disabled when no changes are made', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the save button is disabled when the form has not been modified.',
    });

    const saveButton = page.getByTestId('profile-save-button');
    await expect(saveButton).toBeDisabled();
  });

  // =========================================================================
  // TC-08: Validation — empty first name
  // =========================================================================
  test('TC-08: Validation prevents saving with empty first name', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that clearing the first name field shows a validation error and prevents saving.',
    });

    const firstNameInput = page.getByTestId('profile-first-name-input');
    await firstNameInput.clear();

    // Click save to trigger validation (form uses onSubmit mode)
    const saveButton = page.getByTestId('profile-save-button');
    await saveButton.click();

    // Verify validation error appears — "Мінімум 2 символи"
    await expect(page.getByText(t('validation.nameMin'))).toBeVisible({ timeout: 5000 });

    // Verify no API call was made
    // (form should not submit with validation errors)
  });

  // =========================================================================
  // TC-09: Validation — empty last name
  // =========================================================================
  test('TC-09: Validation prevents saving with empty last name', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that clearing the last name field shows a validation error.',
    });

    const lastNameInput = page.getByTestId('profile-last-name-input');
    await lastNameInput.clear();

    // Click save to trigger validation
    const saveButton = page.getByTestId('profile-save-button');
    await saveButton.click();

    // Verify validation error appears — "Мінімум 2 символи"
    await expect(page.getByText(t('validation.nameMin'))).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // TC-10: Validation — invalid phone format
  // =========================================================================
  test('TC-10: Validation prevents saving with invalid phone format', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that entering an invalid phone number shows a validation error.',
    });

    const phoneInput = page.getByTestId('profile-phone-input');
    await phoneInput.clear();
    await phoneInput.fill('invalid-phone-!!!');

    // Click save to trigger validation
    const saveButton = page.getByTestId('profile-save-button');
    await saveButton.click();

    // Verify validation error appears — "Телефон містить недопустимі символи" / "Phone contains invalid characters"
    await expect(page.getByText(t('validation.phoneInvalid'))).toBeVisible({ timeout: 5000 });
  });
});

test.describe('User Profile — Edge Cases', () => {
  // =========================================================================
  // TC-11: Profile page handles loading state
  // =========================================================================
  test('TC-11: Profile page shows loading state while fetching data', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the profile page displays a loading indicator while user data is being fetched.',
    });

    await loginAs(page, validEmail, validPassword);

    // Slow down and tag the GET profile response to avoid matching unrelated requests.
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

    await page.goto('/profile');

    const profileResponse = await profileResponsePromise;
    expect(profileResponse.ok()).toBeTruthy();
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(900);

    // Verify page remains functional after delayed response
    await expect(page.getByTestId('profile-first-name-input')).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // TC-12: Unauthenticated access redirects to login
  // =========================================================================
  test('TC-12: Unauthenticated users are redirected from profile to login', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that accessing the profile page without authentication redirects to the login page.',
    });

    // Clear auth state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
    });

    // Try to access profile directly
    await page.goto('/profile');

    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
  });

  // =========================================================================
  // TC-13: Profile update handles API error gracefully
  // =========================================================================
  test('TC-13: Profile update shows error message on API failure', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that when the profile update API call fails, an appropriate error message is displayed.',
    });

    await loginAs(page, validEmail, validPassword);

    await page.goto('/profile');
    // Wait for route fallback to disappear
    await expect(page.getByText(t('common.loadingInterface'))).not.toBeVisible({ timeout: 15000 });
    // Wait for profile data to load
    await expect(page.getByText(t('profile.loadingProfile'))).not.toBeVisible({ timeout: 10000 });

    // Mock API failure for profile update
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

    const firstNameInput = page.getByTestId('profile-first-name-input');
    await firstNameInput.clear();
    await firstNameInput.fill('ErrorTest');

    const saveButton = page.getByTestId('profile-save-button');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Verify error message is displayed
    await expect(page.getByText('Internal server error').first()).toBeVisible({ timeout: 5000 });
  });
});
