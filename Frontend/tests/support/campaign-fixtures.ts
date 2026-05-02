import { test as base, expect } from './fixtures';
import type { APIRequestContext } from '@playwright/test';
import {
  buildCookieAuthHeaders,
  createOrganizationViaApi,
  E2E_API_BASE_URL,
  registerAndSetAuthStorage,
  type AuthSession,
} from './e2e-auth';

interface CampaignSeedContext {
  orgId: string;
  auth: AuthSession;
}

interface CampaignPayload {
  titleUk?: string;
  titleEn?: string;
  description?: string;
  goalAmount?: number;
  deadline?: string;
}

interface CampaignEntity {
  id: string;
  titleUk: string;
  titleEn: string;
}

class CampaignApiSeeder {
  private readonly request: APIRequestContext;
  private readonly auth: AuthSession;

  constructor(request: APIRequestContext, auth: AuthSession) {
    this.request = request;
    this.auth = auth;
  }

  async createCampaign(orgId: string, payload?: CampaignPayload): Promise<CampaignEntity> {
    const titleUk = payload?.titleUk ?? `E2E Кампанія ${Date.now()}`;
    const titleEn = payload?.titleEn ?? `E2E Campaign ${Date.now()}`;

    const response = await this.request.post(`${E2E_API_BASE_URL}/api/organizations/${orgId}/campaigns`, {
      data: {
        titleUk,
        titleEn,
        description: payload?.description ?? 'E2E campaign description',
        goalAmount: payload?.goalAmount ?? 50_000,
        deadline: payload?.deadline,
      },
      headers: buildCookieAuthHeaders(this.auth),
    });

    if (!response.ok()) {
      throw new Error(`Failed to create campaign: ${response.status()} ${await response.text()}`);
    }

    const body = (await response.json()) as { id?: string; data?: { id?: string } };
    const id = body.data?.id ?? body.id;
    if (!id) {
      throw new Error('Campaign creation response does not include an id');
    }

    return { id, titleUk, titleEn };
  }

  async activateCampaign(campaignId: string): Promise<void> {
    const response = await this.request.put(`${E2E_API_BASE_URL}/api/campaigns/${campaignId}/status`, {
      data: { newStatus: 1 },
      headers: buildCookieAuthHeaders(this.auth),
    });

    if (!response.ok()) {
      throw new Error(`Failed to activate campaign: ${response.status()} ${await response.text()}`);
    }
  }
}

type CampaignFixtures = {
  campaignSeed: CampaignSeedContext;
  campaignApi: CampaignApiSeeder;
};

export const test = base.extend<CampaignFixtures>({
  campaignSeed: async ({ page }, finishFixture) => {
    const user = await registerAndSetAuthStorage(page, {
      firstName: 'E2E',
      lastName: 'User',
      emailPrefix: 'campaign-e2e',
    });

    const orgId = await createOrganizationViaApi(
      page.request,
      user.auth,
      `Campaigns Test Org ${Date.now()}`,
    );

    await finishFixture({
      orgId,
      auth: user.auth,
    });
  },
  campaignApi: async ({ page, campaignSeed }, finishFixture) => {
    await finishFixture(new CampaignApiSeeder(page.request, campaignSeed.auth));
  },
});

export { expect };
