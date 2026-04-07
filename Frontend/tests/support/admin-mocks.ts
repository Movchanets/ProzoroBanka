import type { Page, Route } from '@playwright/test';

export async function mockMyOrganizationsNav(page: Page): Promise<void> {
  await page.route('**/api/organizations/my', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'org-nav-1',
          name: 'Org Nav',
          slug: 'org-nav',
        },
      ]),
    });
  });
}

export async function mockAdminSettings(page: Page): Promise<void> {
  await page.route('**/api/admin/settings/plans', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          free: {
            maxCampaigns: 3,
            maxMembers: 10,
            maxOcrExtractionsPerMonth: 100,
          },
          paid: {
            maxCampaigns: 100,
            maxMembers: 200,
            maxOcrExtractionsPerMonth: 5000,
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: route.request().postData() ?? '{}',
    });
  });

  await page.route('**/api/admin/settings/general', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          maxOwnedOrganizationsForNonAdmin: 10,
          maxJoinedOrganizationsForNonAdmin: 20,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: route.request().postData() ?? '{}',
    });
  });

  await page.route('**/api/admin/settings/ocr-models', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: route.request().postData() ?? '{}',
    });
  });
}

export async function fulfillOrganizationsList(route: Route, items: unknown[]): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items,
      totalCount: items.length,
      page: 1,
      pageSize: 20,
    }),
  });
}
