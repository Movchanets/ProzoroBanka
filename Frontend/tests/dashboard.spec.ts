import { test, expect } from './support/fixtures';
import { t, setTestLanguage } from './support/i18n';
import {
  createOrganizationForCurrentSession,
  loginViaUi,
  registerAndSetAuthStorage,
  createOrganizationViaApi,
  getAccessTokenFromAuthStorage,
} from './support/e2e-auth';
import type { OnboardingPage } from './pages/OnboardingPage';

const VALID_EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'Qwerty-1';

test.describe.configure({ timeout: 60_000 });

async function loginAs(page: import('@playwright/test').Page) {
  await loginViaUi(page, VALID_EMAIL, VALID_PASSWORD, {
    expectedUrlPattern: /.*\/(onboarding|dashboard).*/,
  });
}

async function registerFreshUser(page: import('@playwright/test').Page) {
  await registerAndSetAuthStorage(page, {
    firstName: 'E2E',
    lastName: 'User',
    emailPrefix: 'dashboard-e2e',
  });

  await page.goto('/onboarding');
  await expect(page).toHaveURL(/.*\/(onboarding|dashboard).*/, { timeout: 10000 });
}

async function createOrgViaAPI(page: import('@playwright/test').Page, name: string): Promise<string> {
  return createOrganizationForCurrentSession(page, name);
}

async function openCreateOrgDialogFromOnboarding(page: import('@playwright/test').Page, onboardingPage: OnboardingPage) {
  await setTestLanguage(page);

  await onboardingPage.goto();
  await expect(page.getByText(t('common.loadingInterface'))).not.toBeVisible({ timeout: 15000 });

  await onboardingPage.createOrgButton.click({ force: true });
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
}

test.describe('Dashboard — Organization Creation', () => {
  test.beforeEach(async ({ page }) => {
    await registerFreshUser(page);
  });

  test('TC-01: Create organization dialog opens with all required fields', async ({ page, onboardingPage, createOrgDialog }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the create organization dialog opens and displays all required form fields.',
    });

    await openCreateOrgDialogFromOnboarding(page, onboardingPage);

    await expect(createOrgDialog.nameInput).toBeVisible();
    await expect(createOrgDialog.slugInput).toBeVisible();
    await expect(createOrgDialog.descriptionInput).toBeVisible();
    await expect(createOrgDialog.websiteInput).toBeVisible();
    await expect(createOrgDialog.cancelButton).toBeVisible();
    await expect(createOrgDialog.submitButton).toBeVisible();
  });

  test('TC-02: Successfully create a new organization with valid data', async ({ page, onboardingPage, createOrgDialog }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that creating an organization with valid data succeeds and redirects to the dashboard.',
    });

    await openCreateOrgDialogFromOnboarding(page, onboardingPage);

    const orgName = `Test Org ${Date.now()}`;

    await createOrgDialog.fill(orgName, 'Test organization for E2E testing', 'https://example.org');

    const slugValue = await createOrgDialog.slugInput.inputValue();
    expect(slugValue).toBeTruthy();
    expect(slugValue).toMatch(/^[a-z0-9-]+$/);

    const createResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/organizations') && response.request().method() === 'POST'
    );

    await createOrgDialog.submitButton.click();

    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBeTruthy();

    await expect(page).toHaveURL(/.*\/dashboard\/[a-f0-9-]+/, { timeout: 10000 });
    await expect(page.getByRole('heading', { level: 1, name: orgName, exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('TC-03: Validation prevents creating organization with empty name', async ({ page, onboardingPage, createOrgDialog }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that submitting without a name shows a validation error.',
    });

    await openCreateOrgDialogFromOnboarding(page, onboardingPage);

    await createOrgDialog.submitButton.click();

    await expect(page.getByText(t('validation.orgNameMin'))).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('TC-04: Validation prevents creating organization with name too short', async ({ page, onboardingPage, createOrgDialog }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that entering a name shorter than 3 characters shows a validation error.',
    });

    await openCreateOrgDialogFromOnboarding(page, onboardingPage);

    await createOrgDialog.nameInput.fill('AB');
    await createOrgDialog.submitButton.click();

    await expect(page.getByText(t('validation.orgNameMin'))).toBeVisible({ timeout: 5000 });
  });

  test('TC-05: Validation prevents creating organization with invalid website URL', async ({ page, onboardingPage, createOrgDialog }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that entering an invalid website URL shows a validation error.',
    });

    await openCreateOrgDialogFromOnboarding(page, onboardingPage);

    await createOrgDialog.nameInput.fill('Valid Org Name');
    await createOrgDialog.websiteInput.fill('not-a-valid-url');
    await createOrgDialog.submitButton.click();

    await expect(page.getByText(t('validation.urlInvalid'))).toBeVisible({ timeout: 5000 });
  });

  test('TC-06: Slug is auto-generated from organization name', async ({ page, onboardingPage, createOrgDialog }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the slug field is automatically populated based on the name input.',
    });

    await openCreateOrgDialogFromOnboarding(page, onboardingPage);

    await createOrgDialog.nameInput.fill('Test Organization Name');

    const slugValue = await createOrgDialog.slugInput.inputValue();
    expect(slugValue).toBe('test-organization-name');
  });

  test('TC-07: User can override the auto-generated slug', async ({ page, onboardingPage, createOrgDialog }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that after auto-generation, the user can manually edit the slug.',
    });

    await openCreateOrgDialogFromOnboarding(page, onboardingPage);

    await createOrgDialog.nameInput.fill('First Name');
    expect(await createOrgDialog.slugInput.inputValue()).toBe('first-name');

    await createOrgDialog.slugInput.clear();
    await createOrgDialog.slugInput.fill('custom-slug');

    await createOrgDialog.nameInput.fill('Second Name');
    expect(await createOrgDialog.slugInput.inputValue()).toBe('custom-slug');
  });

  test('TC-08: Cancel button closes dialog without creating organization', async ({ page, onboardingPage, createOrgDialog }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that clicking Cancel closes the dialog.',
    });

    await openCreateOrgDialogFromOnboarding(page, onboardingPage);

    await createOrgDialog.nameInput.fill('Should Not Be Created');
    await createOrgDialog.cancelButton.click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('TC-09: Create organization shows error message on API failure', async ({ page, onboardingPage, createOrgDialog }) => {
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

    await openCreateOrgDialogFromOnboarding(page, onboardingPage);

    await createOrgDialog.nameInput.fill('Duplicate Org');
    await createOrgDialog.submitButton.click();

    await expect(page.getByText(/already exists|вже існує/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

test.describe('Dashboard — Organization Settings', () => {
  let orgId: string;

  test.beforeEach(async ({ page, orgSettingsPage }) => {
    await loginAs(page);

    const token = await getAccessTokenFromAuthStorage(page);
    orgId = await createOrganizationViaApi(page.request, token, `Settings Test ${Date.now()}`);

    await orgSettingsPage.goto(orgId);
    await expect(page).toHaveURL(/.*\/settings/);
    await expect(page.getByText(t('common.loadingInterface'))).not.toBeVisible({ timeout: 15000 });
  });

  test('TC-10: Organization settings page displays current organization data', async ({ page, orgSettingsPage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the settings page loads and shows the organization fields.',
    });

    await expect(page.getByRole('heading', { name: t('nav.settings') })).toBeVisible();

    await expect(orgSettingsPage.nameInput).toBeVisible();
    await expect(orgSettingsPage.descriptionInput).toBeVisible();
    await expect(orgSettingsPage.websiteInput).toBeVisible();
    await expect(orgSettingsPage.emailInput).toBeVisible();
    await expect(orgSettingsPage.phoneInput).toBeVisible();
    await expect(orgSettingsPage.planPlaceholderCard).toBeVisible();
    await expect(orgSettingsPage.planPlaceholderTitle).toBeVisible();
    await expect(orgSettingsPage.planPlaceholderDescription).toBeVisible();

    await expect(orgSettingsPage.saveButton).toBeVisible();
  });

  test('TC-11: Update organization name and save changes', async ({ page, orgSettingsPage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the organization name persists the change.',
    });

    const originalValue = await orgSettingsPage.nameInput.inputValue();
    const newValue = `${originalValue} Updated`;

    await orgSettingsPage.nameInput.clear();
    await orgSettingsPage.nameInput.fill(newValue);

    await expect(orgSettingsPage.saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/organizations/${orgId}`) && response.request().method() === 'PUT'
    );

    await orgSettingsPage.saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('organizations.settings.savedMessage'))).toBeVisible({ timeout: 5000 });
    await expect(orgSettingsPage.nameInput).toHaveValue(newValue);
  });

  test('TC-12: Update organization description and save changes', async ({ page, orgSettingsPage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the organization description persists correctly.',
    });

    const newDescription = `Updated description at ${Date.now()}`;

    await orgSettingsPage.descriptionInput.clear();
    await orgSettingsPage.descriptionInput.fill(newDescription);

    await expect(orgSettingsPage.saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/organizations/${orgId}`) && response.request().method() === 'PUT'
    );

    await orgSettingsPage.saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('organizations.settings.savedMessage'))).toBeVisible({ timeout: 5000 });
    await expect(orgSettingsPage.descriptionInput).toHaveValue(newDescription);
  });

  test('TC-13: Update organization website URL', async ({ page, orgSettingsPage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the organization website URL persists correctly.',
    });

    const newWebsite = 'https://updated-example.org';

    await orgSettingsPage.websiteInput.clear();
    await orgSettingsPage.websiteInput.fill(newWebsite);

    await expect(orgSettingsPage.saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/organizations/${orgId}`) && response.request().method() === 'PUT'
    );

    await orgSettingsPage.saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('organizations.settings.savedMessage'))).toBeVisible({ timeout: 5000 });
    await expect(orgSettingsPage.websiteInput).toHaveValue(newWebsite);
  });

  test('TC-14: Update organization contact email', async ({ page, orgSettingsPage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the organization contact email persists correctly.',
    });

    const newEmail = 'contact@example.org';

    await orgSettingsPage.emailInput.clear();
    await orgSettingsPage.emailInput.fill(newEmail);

    await expect(orgSettingsPage.saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/organizations/${orgId}`) && response.request().method() === 'PUT'
    );

    await orgSettingsPage.saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('organizations.settings.savedMessage'))).toBeVisible({ timeout: 5000 });
    await expect(orgSettingsPage.emailInput).toHaveValue(newEmail);
  });

  test('TC-15: Update organization phone number', async ({ page, orgSettingsPage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that updating the organization phone number persists correctly.',
    });

    const newPhone = '+380671234567';

    await orgSettingsPage.phoneInput.clear();
    await orgSettingsPage.phoneInput.fill(newPhone);

    await expect(orgSettingsPage.saveButton).toBeEnabled();

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/organizations/${orgId}`) && response.request().method() === 'PUT'
    );

    await orgSettingsPage.saveButton.click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByText(t('organizations.settings.savedMessage'))).toBeVisible({ timeout: 5000 });
    await expect(orgSettingsPage.phoneInput).toHaveValue(newPhone);
  });

  test('TC-16: Save button is disabled when no changes are made', async ({ orgSettingsPage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the save button is disabled when the form has not been modified.',
    });

    await expect(orgSettingsPage.saveButton).toBeDisabled();
  });

  test('TC-17: Validation prevents saving with invalid contact email', async ({ page, orgSettingsPage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that entering an invalid email shows a validation error.',
    });

    await orgSettingsPage.emailInput.clear();
    await orgSettingsPage.emailInput.fill('not-an-email');

    await orgSettingsPage.saveButton.click();

    await expect(page.getByText(t('validation.emailInvalid'))).toBeVisible({ timeout: 5000 });
  });

  test('TC-18: Validation prevents saving with invalid phone format', async ({ page, orgSettingsPage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that entering an invalid phone number shows a validation error.',
    });

    await orgSettingsPage.phoneInput.clear();
    await orgSettingsPage.phoneInput.fill('invalid-phone-!!!');

    await orgSettingsPage.saveButton.click();

    await expect(page.getByText(t('validation.phoneInvalid'))).toBeVisible({ timeout: 5000 });
  });

  test('TC-19: Settings update shows error message on API failure', async ({ page, orgSettingsPage }) => {
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

    await orgSettingsPage.nameInput.clear();
    await orgSettingsPage.nameInput.fill('Error Test Org');

    await expect(orgSettingsPage.saveButton).toBeEnabled();
    await orgSettingsPage.saveButton.click();

    await expect(page.getByText('Internal server error').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Dashboard — Home Page', () => {
  let orgId: string;

  test.beforeEach(async ({ page, dashboardHomePage }) => {
    await loginAs(page);

    orgId = await createOrgViaAPI(page, `Home Test ${Date.now()}`);

    await dashboardHomePage.goto(orgId);
    await expect(page).toHaveURL(/.*\/dashboard\//);
    await expect(page.getByText(t('common.loadingInterface'))).not.toBeVisible({ timeout: 15000 });
  });

  test('TC-20: Dashboard home page displays organization statistics', async ({ page, dashboardHomePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that the dashboard home page shows organization stats.',
    });

    await expect(page.getByText(t('dashboard.statMembers'), { exact: true })).toBeVisible();
    await expect(page.getByText(t('dashboard.statActiveCampaigns'), { exact: true })).toBeVisible();
    await expect(page.getByText(t('dashboard.statRaised'), { exact: true })).toBeVisible();
    await expect(page.locator('main').getByText(t('dashboard.statReceipts')).first()).toBeVisible();
    await expect(dashboardHomePage.planCard).toBeVisible();
    await expect(dashboardHomePage.planName).toBeVisible();
    await expect(dashboardHomePage.planDescription).toBeVisible();
  });

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

  test('TC-22: Dashboard sidebar navigation links work correctly', async ({ page, dashboardHomePage }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that clicking sidebar navigation links navigates to the correct pages.',
    });

    await dashboardHomePage.clickNavLinkSafe('campaigns');
    await expect(page).toHaveURL(/.*\/campaigns/);

    await dashboardHomePage.clickNavLinkSafe('settings');
    await expect(page).toHaveURL(/.*\/settings/);

    await dashboardHomePage.clickNavLinkSafe('home');
    await expect(page).toHaveURL(new RegExp(`.*/dashboard/${orgId}/?$`));
  });
});

test.describe('Dashboard — Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('TC-23: Unauthenticated users are redirected from dashboard to login', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies that accessing the dashboard without authentication redirects to login.',
    });

    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
    });

    const unauthPage = await page.context().newPage();
    await unauthPage.goto('/dashboard/some-org-id');
    await expect(unauthPage).toHaveURL(/.*\/login/, { timeout: 10000 });
    await unauthPage.close();
  });
});
