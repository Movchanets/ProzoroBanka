import { test, expect } from '@playwright/test';

test.describe('Navigation & Public Pages', () => {
  test('unauthenticated users are securely redirected from root to login route', async ({ page }) => {
    // 1. Navigate to the root URL (Vite Dev Server URL)
    await page.goto('/');

    // 2. The router's GuestRoute / ProtectedRoute should intercept
    // and correctly push the URL forward to /login since there is no session.
    await expect(page).toHaveURL(/.*\/login/);

    // 3. Ensure the login page view successfully mounted
    const mainHeading = page.getByRole('heading', { level: 1 });
    await expect(mainHeading).toContainText(/Поверніться до фінансового кабінету|Увійти|Return to your finance dashboard|Sign in/i);

    // 4. Verify the email input is visible and interactive
    const emailInput = page.getByLabel(/Адреса електронної пошти|Email/i);
    await expect(emailInput).toBeVisible();
  });
});
