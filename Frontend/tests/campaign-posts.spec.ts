import { test, expect } from './support/fixtures';
import { setupPublicPagesMocks } from './support/public-mocks';

test.describe('Campaign Posts', () => {
  // TC-01 & TC-02: Post gallery from updates tab removed — updates tab now shows unified feed timeline.
  // Post images render inline in the feed without a separate gallery modal.

  test('TC-03: public toolbar and gallery can coexist safely', async ({ campaignPublicPage, page }) => {
    await setupPublicPagesMocks(page);
    await campaignPublicPage.goto('camp-1');

    await campaignPublicPage.openThemeMenu();
    await expect(campaignPublicPage.themeToggleTrigger).toBeVisible();
    await page.keyboard.press('Escape');

    await campaignPublicPage.openCoverGallery();
    await expect(campaignPublicPage.galleryDialog).toBeVisible();
    await expect(campaignPublicPage.galleryCounter).toContainText('1 / 1');
  });
});
