import { test, expect } from './support/fixtures';
import { setupPublicPagesMocks } from './support/public-mocks';

test.describe('Campaign Posts', () => {
  test('TC-01: public campaign post gallery opens as a separate modal', async ({ campaignPublicPage, page }) => {
    await setupPublicPagesMocks(page);
    await campaignPublicPage.goto('camp-1');

    await expect(campaignPublicPage.firstPostOpenButton).toBeVisible();
    await campaignPublicPage.openFirstPostGallery();

    await expect(campaignPublicPage.galleryDialog).toBeVisible();
    await expect(campaignPublicPage.galleryCounter).toContainText('1 / 3');
    await campaignPublicPage.galleryNextButton.click();
    await expect(campaignPublicPage.galleryCounter).toContainText('2 / 3');
  });

  test('TC-02: public page cover gallery and post gallery are isolated', async ({ campaignPublicPage, page }) => {
    await setupPublicPagesMocks(page);
    await campaignPublicPage.goto('camp-1');

    await campaignPublicPage.openCoverGallery();
    await expect(campaignPublicPage.galleryDialog).toBeVisible();
    await expect(campaignPublicPage.galleryCounter).toContainText('1 / 1');
    await page.keyboard.press('Escape');

    await campaignPublicPage.openFirstPostGallery();
    await expect(campaignPublicPage.galleryDialog).toBeVisible();
    await expect(campaignPublicPage.galleryCounter).toContainText('1 / 3');
    await campaignPublicPage.galleryNextButton.click();
    await expect(campaignPublicPage.galleryCounter).toContainText('2 / 3');
  });

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
