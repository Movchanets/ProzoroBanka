import { test, expect } from '@playwright/test';

import { t, setTestLanguage } from './support/i18n';

const VALID_EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'Qwerty-1';
const TURNSTILE_TIMEOUT = 30000;

test.describe.configure({ timeout: 60_000 });

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loginAs(page: import('@playwright/test').Page) {
  await setTestLanguage(page);

  await page.goto('/login');
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: TURNSTILE_TIMEOUT });
  await page.getByTestId('login-email-input').fill(VALID_EMAIL);
  await page.getByTestId('login-password-input').fill(VALID_PASSWORD);
  await page.getByTestId('login-submit-button').click();
  await expect(page).toHaveURL(/.*\/(onboarding|dashboard).*/, { timeout: 10000 });
}

async function registerFreshUser(page: import('@playwright/test').Page) {
  await setTestLanguage(page);

  const uniquePart = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const email = `e2e-${uniquePart}@example.com`;
  const password = 'Qwerty-1';

  await page.goto('/register');
  const turnstileInput = page.locator('input[name="cf-turnstile-response"]');
  await expect(turnstileInput).toHaveValue(/.+/, { timeout: TURNSTILE_TIMEOUT });
  const turnstileToken = (await turnstileInput.inputValue()).trim();

  const registerResponse = await page.request.post('http://localhost:5188/api/auth/register', {
    data: {
      email,
      password,
      confirmPassword: password,
      firstName: 'E2E',
      lastName: 'User',
      turnstileToken,
    },
  });

  if (!registerResponse.ok()) {
    throw new Error(`Failed to register test user: ${registerResponse.status()} ${await registerResponse.text()}`);
  }

  const auth = await registerResponse.json();

  await page.goto('/');
  await page.evaluate((payload) => {
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          accessTokenExpiry: payload.accessTokenExpiry,
          user: payload.user,
          isAuthenticated: true,
        },
        version: 0,
      })
    );
  }, auth);

  await page.goto('/onboarding');
  await expect(page).toHaveURL(/.*\/(onboarding|dashboard).*/, { timeout: 10000 });
}

/** Create an org via API and return its ID. Must be called AFTER loginAs(). */
async function createOrgViaAPI(page: import('@playwright/test').Page, name: string): Promise<string> {
  // Get auth token from localStorage
  const authData = await page.evaluate(() => localStorage.getItem('auth-storage'));
  const { state } = JSON.parse(authData!);
  const token = state.accessToken;

  const response = await page.request.post('http://localhost:5188/api/organizations', {
    data: { name, slug: name.toLowerCase().replace(/\s+/g, '-') },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create org: ${response.status()} ${await response.text()}`);
  }

  const org = await response.json();
  return org.id;
}

/** Navigate to onboarding and open the create org dialog */
async function openCreateOrgDialogFromOnboarding(page: import('@playwright/test').Page) {
  await setTestLanguage(page);

  await page.goto('/onboarding');
  await expect(page.getByText(t('common.loadingInterface'))).not.toBeVisible({ timeout: 15000 });

  await page.getByTestId('onboarding-create-organization-button').click({ force: true });

  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
}

async function openDashboardNavLink(page: import('@playwright/test').Page, key: 'home' | 'campaigns' | 'settings') {
  const selector = `dashboard-nav-${key}`;
  const desktopLink = page.getByTestId(selector).first();
  if (await desktopLink.isVisible().catch(() => false)) {
    await desktopLink.click({ force: true });
    return;
  }

  await page.getByTestId('dashboard-mobile-menu-button').click();
  const mobileLink = page.getByRole('dialog').getByTestId(selector).first();
  await expect(mobileLink).toBeVisible({ timeout: 10000 });
  await mobileLink.scrollIntoViewIfNeeded();
  await mobileLink.click();
}

// ── Organization Creation Tests ──────────────────────────────────────────────

test.describe('Dashboard — Organization Creation', () => {
  test.beforeEach(async ({ page }) => {
    await registerFreshUser(page);
  });

  // =========================================================================
  // TC-01: Create organization dialog opens correctly
  // =========================================================================
  test('TC-01: Create organization dialog opens with all required fields', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the create organization dialog opens and displays all required form fields.',
    });

    await openCreateOrgDialogFromOnboarding(page);

    // Verify all form fields are present
    await expect(page.getByTestId('create-org-name-input')).toBeVisible();
    await expect(page.getByTestId('create-org-slug-input')).toBeVisible();
    await expect(page.getByTestId('create-org-description-input')).toBeVisible();
    await expect(page.getByTestId('create-org-website-input')).toBeVisible();

    // Verify action buttons
    await expect(page.getByTestId('create-org-cancel-button')).toBeVisible();
    await expect(page.getByTestId('create-org-submit-button')).toBeVisible();
  });

  // =========================================================================
  // TC-02: Create organization with valid data
  // =========================================================================
  test('TC-02: Successfully create a new organization with valid data', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that creating an organization with valid data succeeds and redirects to the dashboard.',
    });

    await openCreateOrgDialogFromOnboarding(page);

    const orgName = `Test Org ${Date.now()}`;

    await page.getByTestId('create-org-name-input').fill(orgName);
    await page.getByTestId('create-org-description-input').fill('Test organization for E2E testing');
    await page.getByTestId('create-org-website-input').fill('https://example.org');

    // Verify slug is auto-generated
    const slugInput = page.getByTestId('create-org-slug-input');
    const slugValue = await slugInput.inputValue();
    expect(slugValue).toBeTruthy();
    expect(slugValue).toMatch(/^[a-z0-9-]+$/);

    const createResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/organizations') && response.request().method() === 'POST'
    );

    await page.getByTestId('create-org-submit-button').click();

    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBeTruthy();

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard\/[a-f0-9-]+/, { timeout: 10000 });

    // Verify organization name appears in the header
    await expect(page.getByRole('heading', { name: orgName })).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // TC-03: Validation — empty organization name
  // =========================================================================
  test('TC-03: Validation prevents creating organization with empty name', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that submitting without a name shows a validation error.',
    });

    await openCreateOrgDialogFromOnboarding(page);

    await page.getByTestId('create-org-submit-button').click();

    // Verify validation error
    await expect(page.getByText(t('validation.orgNameMin'))).toBeVisible({ timeout: 5000 });

    // Dialog should still be open
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  // =========================================================================
  // TC-04: Validation — name too short
  // =========================================================================
  test('TC-04: Validation prevents creating organization with name too short', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that entering a name shorter than 3 characters shows a validation error.',
    });

    await openCreateOrgDialogFromOnboarding(page);

    await page.getByTestId('create-org-name-input').fill('AB');
    await page.getByTestId('create-org-submit-button').click();

    await expect(page.getByText(t('validation.orgNameMin'))).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // TC-05: Validation — invalid website URL
  // =========================================================================
  test('TC-05: Validation prevents creating organization with invalid website URL', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that entering an invalid website URL shows a validation error.',
    });

    await openCreateOrgDialogFromOnboarding(page);

    await page.getByTestId('create-org-name-input').fill('Valid Org Name');
    await page.getByTestId('create-org-website-input').fill('not-a-valid-url');
    await page.getByTestId('create-org-submit-button').click();

    await expect(page.getByText(t('validation.urlInvalid'))).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // TC-06: Slug auto-generation from name
  // =========================================================================
  test('TC-06: Slug is auto-generated from organization name', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the slug field is automatically populated based on the name input.',
    });

    await openCreateOrgDialogFromOnboarding(page);

    const nameInput = page.getByTestId('create-org-name-input');
    const slugInput = page.getByTestId('create-org-slug-input');

    await nameInput.fill('Test Organization Name');

    const slugValue = await slugInput.inputValue();
    expect(slugValue).toBe('test-organization-name');
  });

  // =========================================================================
  // TC-07: Custom slug override
  // =========================================================================
  test('TC-07: User can override the auto-generated slug', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that after auto-generation, the user can manually edit the slug.',
    });

    await openCreateOrgDialogFromOnboarding(page);

    const nameInput = page.getByTestId('create-org-name-input');
    const slugInput = page.getByTestId('create-org-slug-input');

    await nameInput.fill('First Name');
    expect(await slugInput.inputValue()).toBe('first-name');

    await slugInput.clear();
    await slugInput.fill('custom-slug');

    await nameInput.fill('Second Name');
    expect(await slugInput.inputValue()).toBe('custom-slug');
  });

  // =========================================================================
  // TC-08: Cancel closes dialog without creating
  // =========================================================================
  test('TC-08: Cancel button closes dialog without creating organization', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that clicking Cancel closes the dialog.',
    });

    await openCreateOrgDialogFromOnboarding(page);

    await page.getByTestId('create-org-name-input').fill('Should Not Be Created');
    await page.getByTestId('create-org-cancel-button').click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  // =========================================================================
  // TC-09: Create organization handles API error
  // =========================================================================
  test('TC-09: Create organization shows error message on API failure', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that when the API call fails, an error message is displayed.',
    });

    await page.route('**/api/organizations', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Organization with this slug already exists' }),
        });
      } else {
        route.continue();
      }
    });

    await openCreateOrgDialogFromOnboarding(page);

    await page.getByTestId('create-org-name-input').fill('Duplicate Org');
    await page.getByTestId('create-org-submit-button').click();

    await expect(page.getByText(/already exists|вже існує/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

// ── Organization Settings Tests ──────────────────────────────────────────────

test.describe('Dashboard — Organization Settings', () => {
  let orgId: string;

  test.beforeEach(async ({ page }) => {
    await loginAs(page);

    // Create org via API for consistent test setup
    orgId = await createOrgViaAPI(page, `Settings Test ${Date.now()}`);

    // Navigate to settings
    await page.goto(`/dashboard/${orgId}/settings`);
    await expect(page).toHaveURL(/.*\/settings/);
    await expect(page.getByText(t('common.loadingInterface'))).not.toBeVisible({ timeout: 15000 });
  });

  // =========================================================================
  // TC-10: Settings page loads with organization data
  // =========================================================================
  test('TC-10: Organization settings page displays current organization data', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the settings page loads and shows the organization fields.',
    });

    await expect(page.getByRole('heading', { name: t('nav.settings') })).toBeVisible();

    await expect(page.getByTestId('org-settings-name-input')).toBeVisible();
    await expect(page.getByTestId('org-settings-description-input')).toBeVisible();
    await expect(page.getByTestId('org-settings-website-input')).toBeVisible();
    await expect(page.getByTestId('org-settings-email-input')).toBeVisible();
    await expect(page.getByTestId('org-settings-phone-input')).toBeVisible();

    await expect(page.getByTestId('org-settings-save-button')).toBeVisible();
  });
  // TC-11: Update organization name
  // =========================================================================
  test('TC-11: Update organization name and save changes', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the organization name persists the change.',
    });

    const nameInput = page.getByTestId('org-settings-name-input');
    const originalValue = await nameInput.inputValue();
    const newValue = `${originalValue} Updated`;

    await nameInput.clear();
    await nameInput.fill(newValue);

    const saveButton = page.getByTestId('org-settings-save-button');
    await expect(saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/organizations/${orgId}`) && response.request().method() === 'PUT'
    );

    await saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('organizations.settings.savedMessage'))).toBeVisible({ timeout: 5000 });
    await expect(nameInput).toHaveValue(newValue);
  });

  // =========================================================================
  // TC-12: Update organization description
  // =========================================================================
  test('TC-12: Update organization description and save changes', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the organization description persists correctly.',
    });

    const descriptionInput = page.getByTestId('org-settings-description-input');
    const newDescription = `Updated description at ${Date.now()}`;

    await descriptionInput.clear();
    await descriptionInput.fill(newDescription);

    const saveButton = page.getByTestId('org-settings-save-button');
    await expect(saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/organizations/${orgId}`) && response.request().method() === 'PUT'
    );

    await saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('organizations.settings.savedMessage'))).toBeVisible({ timeout: 5000 });
    await expect(descriptionInput).toHaveValue(newDescription);
  });

  // =========================================================================
  // TC-13: Update organization website
  // =========================================================================
  test('TC-13: Update organization website URL', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the organization website URL persists correctly.',
    });

    const websiteInput = page.getByTestId('org-settings-website-input');
    const newWebsite = 'https://updated-example.org';

    await websiteInput.clear();
    await websiteInput.fill(newWebsite);

    const saveButton = page.getByTestId('org-settings-save-button');
    await expect(saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/organizations/${orgId}`) && response.request().method() === 'PUT'
    );

    await saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('organizations.settings.savedMessage'))).toBeVisible({ timeout: 5000 });
    await expect(websiteInput).toHaveValue(newWebsite);
  });

  // =========================================================================
  // TC-14: Update contact email
  // =========================================================================
  test('TC-14: Update organization contact email', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the organization contact email persists correctly.',
    });

    const emailInput = page.getByTestId('org-settings-email-input');
    const newEmail = 'contact@example.org';

    await emailInput.clear();
    await emailInput.fill(newEmail);

    const saveButton = page.getByTestId('org-settings-save-button');
    await expect(saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/organizations/${orgId}`) && response.request().method() === 'PUT'
    );

    await saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('organizations.settings.savedMessage'))).toBeVisible({ timeout: 5000 });
    await expect(emailInput).toHaveValue(newEmail);
  });

  // =========================================================================
  // TC-15: Update phone number
  // =========================================================================
  test('TC-15: Update organization phone number', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the organization phone number persists correctly.',
    });

    const phoneInput = page.getByTestId('org-settings-phone-input');
    const newPhone = '+380671234567';

    await phoneInput.clear();
    await phoneInput.fill(newPhone);

    const saveButton = page.getByTestId('org-settings-save-button');
    await expect(saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/organizations/${orgId}`) && response.request().method() === 'PUT'
    );

    await saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('organizations.settings.savedMessage'))).toBeVisible({ timeout: 5000 });
    await expect(phoneInput).toHaveValue(newPhone);
  });

  // =========================================================================
  // TC-16: Save button disabled when form is unchanged
  // =========================================================================
  test('TC-16: Save button is disabled when no changes are made', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the save button is disabled when the form has not been modified.',
    });

    const saveButton = page.getByTestId('org-settings-save-button');
    await expect(saveButton).toBeDisabled();
  });

  // =========================================================================
  // TC-17: Validation — invalid contact email
  // =========================================================================
  test('TC-17: Validation prevents saving with invalid contact email', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that entering an invalid email shows a validation error.',
    });

    const emailInput = page.getByTestId('org-settings-email-input');
    await emailInput.clear();
    await emailInput.fill('not-an-email');

    const saveButton = page.getByTestId('org-settings-save-button');
    await saveButton.click();

    await expect(page.getByText(t('validation.emailInvalid'))).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // TC-18: Validation — invalid phone format
  // =========================================================================
  test('TC-18: Validation prevents saving with invalid phone format', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that entering an invalid phone number shows a validation error.',
    });

    const phoneInput = page.getByTestId('org-settings-phone-input');
    await phoneInput.clear();
    await phoneInput.fill('invalid-phone-!!!');

    const saveButton = page.getByTestId('org-settings-save-button');
    await saveButton.click();

    await expect(page.getByText(t('validation.phoneInvalid'))).toBeVisible({ timeout: 5000 });
  });

  // =========================================================================
  // TC-19: Settings update handles API error
  // =========================================================================
  test('TC-19: Settings update shows error message on API failure', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that when the API call fails, an error message is displayed.',
    });

    await page.route(`**/api/organizations/${orgId}`, (route) => {
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

    const nameInput = page.getByTestId('org-settings-name-input');
    await nameInput.clear();
    await nameInput.fill('Error Test Org');

    const saveButton = page.getByTestId('org-settings-save-button');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.getByText('Internal server error').first()).toBeVisible({ timeout: 5000 });
  });
});

// ── Dashboard Home Tests ─────────────────────────────────────────────────────

test.describe('Dashboard — Home Page', () => {
  let orgId: string;

  test.beforeEach(async ({ page }) => {
    await loginAs(page);

    // Create org via API
    orgId = await createOrgViaAPI(page, `Home Test ${Date.now()}`);

    // Navigate to dashboard
    await page.goto(`/dashboard/${orgId}`);
    await expect(page).toHaveURL(/.*\/dashboard\//);
    await expect(page.getByText(t('common.loadingInterface'))).not.toBeVisible({ timeout: 15000 });
  });

  // =========================================================================
  // TC-20: Dashboard home displays organization stats
  // =========================================================================
  test('TC-20: Dashboard home page displays organization statistics', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the dashboard home page shows organization stats.',
    });

    await expect(page.getByText(t('dashboard.statMembers'))).toBeVisible();
    await expect(page.getByText(t('dashboard.statActiveCampaigns'))).toBeVisible();
    await expect(page.getByText(t('dashboard.statRaised'))).toBeVisible();
    await expect(page.locator('main').getByText(t('dashboard.statReceipts')).first()).toBeVisible();
  });

  // =========================================================================
  // TC-21: Dashboard home shows quick start guide
  // =========================================================================
  test('TC-21: Dashboard home page shows quick start guide', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the dashboard home page displays the quick start guide.',
    });

    await expect(page.getByText(t('dashboard.quickStart'))).toBeVisible();
    await expect(page.getByText(t('dashboard.step1'))).toBeVisible();
    await expect(page.getByText(t('dashboard.step2'))).toBeVisible();
    await expect(page.getByText(t('dashboard.step3'))).toBeVisible();
  });

  // =========================================================================
  // TC-22: Dashboard navigation works correctly
  // =========================================================================
  test('TC-22: Dashboard sidebar navigation links work correctly', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that clicking sidebar navigation links navigates to the correct pages.',
    });

    // Navigate to campaigns
    await openDashboardNavLink(page, 'campaigns');
    await expect(page).toHaveURL(/.*\/campaigns/);

    // Navigate to settings
    await openDashboardNavLink(page, 'settings');
    await expect(page).toHaveURL(/.*\/settings/);

    // Navigate back to dashboard home
    await openDashboardNavLink(page, 'home');
    await expect(page).toHaveURL(new RegExp(`.*/dashboard/${orgId}/?$`));
  });
});

// ── Edge Cases ───────────────────────────────────────────────────────────────

test.describe('Dashboard — Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  // =========================================================================
  // TC-23: Unauthenticated access redirects to login
  // =========================================================================
  test('TC-23: Unauthenticated users are redirected from dashboard to login', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that accessing the dashboard without authentication redirects to login.',
    });

    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
    });

    await page.goto('/dashboard/some-org-id');

    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
  });
});
