import { test, expect } from '@playwright/test';
import {
  createOrganizationViaApi,
  E2E_API_BASE_URL,
  getAccessTokenFromAuthStorage,
  registerRandomUserViaApi,
  setAuthStorage,
} from './support/e2e-auth';

test.describe.configure({ timeout: 60_000 });

async function registerFreshUser(page: import('@playwright/test').Page) {
  const registeredUser = await registerRandomUserViaApi(page.request, {
    firstName: 'E2E',
    lastName: 'User',
    emailPrefix: 'campaign-e2e',
  });

  await setAuthStorage(page, registeredUser.auth);
  await page.goto('/onboarding');
  await expect(page).toHaveURL(/.*\/(onboarding|dashboard).*/, { timeout: 10_000 });
}

async function createOrgViaAPI(page: import('@playwright/test').Page, name: string): Promise<string> {
  const token = await getAccessTokenFromAuthStorage(page);
  return createOrganizationViaApi(page.request, token, name);
}

async function createCampaignViaApi(
  page: import('@playwright/test').Page,
  orgId: string,
  payload?: {
    title?: string;
    description?: string;
    goalAmount?: number;
    deadline?: string;
  },
): Promise<{ id: string; title: string }> {
  const token = await getAccessTokenFromAuthStorage(page);
  const title = payload?.title ?? `E2E Campaign ${Date.now()}`;

  const response = await page.request.post(`${E2E_API_BASE_URL}/api/organizations/${orgId}/campaigns`, {
    data: {
      title,
      description: payload?.description ?? 'E2E campaign description',
      goalAmount: payload?.goalAmount ?? 50_000,
      deadline: payload?.deadline,
    },
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create campaign: ${response.status()} ${await response.text()}`);
  }

  const body = (await response.json()) as { id?: string; data?: { id?: string } };
  const id = body.data?.id ?? body.id;
  if (!id) {
    throw new Error('Campaign creation response does not include an id');
  }

  return { id, title };
}

test.describe('Dashboard — Campaigns Management', () => {
  let orgId: string;

  test.beforeEach(async ({ page }) => {
    await registerFreshUser(page);
    orgId = await createOrgViaAPI(page, `Campaigns Test Org ${Date.now()}`);
  });

  test('TC-01: User can create a new campaign and is returned to campaigns list', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Creates a campaign through UI and verifies POST success with return to list.',
    });

    await page.goto(`/dashboard/${orgId}/campaigns`);
    await expect(page.getByTestId('campaigns-list-page')).toBeVisible();

    await page.getByTestId('campaigns-list-create-button').click();
    await expect(page).toHaveURL(/.*\/campaigns\/new/);
    await expect(page.getByTestId('campaign-create-page')).toBeVisible();

    const campaignTitle = `Test Campaign ${Date.now()}`;
    await page.getByTestId('campaign-create-title-input').fill(campaignTitle);
    await page.getByTestId('campaign-create-description-input').fill('E2E Test Description for the campaign.');
    await page.getByTestId('campaign-create-goal-input').fill('10000');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const dateString = futureDate.toISOString().split('T')[0];
    await page.getByTestId('campaign-create-deadline-input').fill(dateString);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/organizations/${orgId}/campaigns`) &&
        response.request().method() === 'POST',
    );

    await page.getByTestId('campaign-create-submit-button').click();

    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBeTruthy();

    await expect(page).toHaveURL(new RegExp(`.*/dashboard/${orgId}/campaigns$`));
    await expect(page.getByText(campaignTitle)).toBeVisible({ timeout: 10_000 });
  });

  test('TC-02: User can open campaign details from campaigns list', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Creates a campaign via API and verifies list-to-detail navigation via campaign card.',
    });

    const campaign = await createCampaignViaApi(page, orgId, {
      title: `Detail Campaign ${Date.now()}`,
      goalAmount: 25_000,
    });

    await page.goto(`/dashboard/${orgId}/campaigns`);
    await expect(page.getByTestId('campaigns-list-page')).toBeVisible();

    await page.getByTestId(`campaign-card-${campaign.id}`).click();

    await expect(page).toHaveURL(new RegExp(`.*/dashboard/${orgId}/campaigns/${campaign.id}$`));
    await expect(page.getByTestId('campaign-detail-page')).toBeVisible();
    await expect(page.getByTestId('campaign-detail-title')).toContainText(campaign.title);
    await expect(page.getByTestId('campaign-detail-status-badge')).toBeVisible();
  });

  test('TC-03: User can edit an existing campaign details', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Opens campaign edit page, updates fields, and verifies successful PUT update.',
    });

    const campaign = await createCampaignViaApi(page, orgId, {
      title: `Edit Campaign ${Date.now()}`,
      goalAmount: 45_000,
    });

    await page.goto(`/dashboard/${orgId}/campaigns/${campaign.id}`);
    await expect(page.getByTestId('campaign-detail-edit-button')).toBeVisible();
    await page.getByTestId('campaign-detail-edit-button').click();
    await expect(page).toHaveURL(new RegExp(`.*/dashboard/${orgId}/campaigns/${campaign.id}/edit$`));
    await expect(page.getByTestId('campaign-edit-page')).toBeVisible();

    const updatedTitle = `${campaign.title} Updated`;
    await page.getByTestId('campaign-edit-title-input').fill(updatedTitle);
    await page.getByTestId('campaign-edit-description-input').fill('Updated campaign description from E2E');

    const updateResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/campaigns/${campaign.id}`) && response.request().method() === 'PUT',
    );
    await page.getByTestId('campaign-edit-save-button').click();

    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBeTruthy();

    await expect(page.getByTestId('campaign-edit-success-alert')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('campaign-edit-title-input')).toHaveValue(updatedTitle);
  });

  test('TC-04: User can change campaign status on edit page', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Changes campaign status from Draft to Active and verifies status update request success.',
    });

    const campaign = await createCampaignViaApi(page, orgId, {
      title: `Status Campaign ${Date.now()}`,
      goalAmount: 35_000,
    });

    await page.goto(`/dashboard/${orgId}/campaigns/${campaign.id}/edit`);
    await expect(page.getByTestId('campaign-edit-page')).toBeVisible();
    await expect(page.getByTestId('campaign-edit-status-trigger')).toBeVisible();

    const statusResponsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/campaigns/${campaign.id}/status`) && response.request().method() === 'PUT',
    );

    await page.getByTestId('campaign-edit-status-trigger').click();
    await page.getByTestId('campaign-edit-status-option-1').click();

    const statusResponse = await statusResponsePromise;
    expect(statusResponse.ok()).toBeTruthy();

    await expect(page.getByTestId('campaign-edit-success-alert')).toBeVisible({ timeout: 10_000 });
  });
});
