import { expect, type Page } from "@playwright/test";

const E2E_API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:5188";

export async function gotoAppPath(page: Page, path: string): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      const isRetryableAbort =
        error instanceof Error &&
        (/NS_BINDING_ABORTED/i.test(error.message) ||
          /interrupted by another navigation/i.test(error.message));
      if (!isRetryableAbort || attempt === 2) {
        throw error;
      }
    }
  }
}

async function getAccessTokenFromAuthStorage(page: Page): Promise<string> {
  const authData = await page.evaluate(() =>
    localStorage.getItem("auth-storage"),
  );
  if (!authData) {
    throw new Error("Missing auth-storage in localStorage");
  }

  const { state } = JSON.parse(authData) as {
    state?: { accessToken?: string };
  };
  if (!state?.accessToken) {
    throw new Error("Missing access token in auth-storage");
  }

  return state.accessToken;
}

async function createOrganizationForCurrentSession(
  page: Page,
  name: string,
): Promise<string> {
  const accessToken = await getAccessTokenFromAuthStorage(page);
  const response = await page.request.post(
    `${E2E_API_BASE_URL}/api/organizations`,
    {
      data: {
        name,
        slug: name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-"),
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok()) {
    throw new Error(
      `Failed to create organization: ${response.status()} ${await response.text()}`,
    );
  }

  const org = (await response.json()) as { id: string };
  return org.id;
}

export async function waitForAppReady(
  page: Page,
  timeoutMs = 15_000,
): Promise<void> {
  await page
    .locator('[data-testid="app-loading"]')
    .first()
    .waitFor({ state: "hidden", timeout: timeoutMs });
  await page.waitForLoadState("domcontentloaded");
}

export async function ensureDashboardPath(
  page: Page,
  fallbackOrgName = `E2E Org ${Date.now()}`,
): Promise<string> {
  await gotoAppPath(page, "/dashboard");
  await waitForAppReady(page);

  let currentUrl = page.url();

  if (/\/dashboard(?:$|[?#])/.test(currentUrl)) {
    try {
      await expect
        .poll(() => page.url(), { timeout: 1_500 })
        .not.toMatch(/\/dashboard(?:$|[?#])/);
      currentUrl = page.url();
    } catch {
      currentUrl = page.url();
    }
  }

  const dashboardMatch = currentUrl.match(/\/dashboard\/([^/?#]+)/);
  if (dashboardMatch) {
    return dashboardMatch[1];
  }

  if (
    /\/onboarding(?:$|[/?#])/.test(currentUrl) ||
    /\/dashboard(?:$|[?#])/.test(currentUrl)
  ) {
    const orgId = await createOrganizationForCurrentSession(
      page,
      fallbackOrgName,
    );
    await gotoAppPath(page, `/dashboard/${orgId}`);
    await waitForAppReady(page);
    return orgId;
  }

  throw new Error(`Unexpected dashboard entry URL: ${currentUrl}`);
}
