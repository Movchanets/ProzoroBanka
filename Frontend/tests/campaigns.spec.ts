import { test, expect } from './support/campaign-fixtures';

test.describe.configure({ timeout: 60_000 });

test.describe('Dashboard — Campaigns Management', () => {
  test('TC-01: User can create a new campaign and is returned to campaigns list', async ({ page, campaignsListPage, campaignCreatePage, campaignSeed }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Creates a campaign through UI and verifies POST success with return to list.',
    });

    await campaignsListPage.goto(campaignSeed.orgId);
    await expect(campaignsListPage.pageContainer).toBeVisible();

    await campaignsListPage.openCreateCampaign();
    await expect(page).toHaveURL(/.*\/campaigns\/new/);
    await expect(campaignCreatePage.pageContainer).toBeVisible();

    const campaignTitleUk = `Тестовий збір ${Date.now()}`;
    const campaignTitleEn = `Test Campaign ${Date.now()}`;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const dateString = futureDate.toISOString().split('T')[0];

    await campaignCreatePage.fillForm({
      titleUk: campaignTitleUk,
      titleEn: campaignTitleEn,
      description: 'E2E Test Description for the campaign.',
      goalAmount: '10000',
      deadline: dateString,
    });

    const createResponse = await campaignCreatePage.submitAndWaitForCreate(campaignSeed.orgId);
    expect(createResponse.ok()).toBeTruthy();

    await expect(page).toHaveURL(new RegExp(`.*/dashboard/${campaignSeed.orgId}/campaigns$`));
    await expect(campaignsListPage.getCampaignTitleAny([campaignTitleUk, campaignTitleEn])).toBeVisible({ timeout: 10_000 });
  });

  test('TC-02: User can open campaign details from campaigns list', async ({ page, campaignsListPage, campaignDetailPage, campaignApi, campaignSeed }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Creates a campaign via API and verifies list-to-detail navigation via campaign card.',
    });

    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Детальний збір ${Date.now()}`,
      titleEn: `Detail Campaign ${Date.now()}`,
      goalAmount: 25_000,
    });

    await campaignsListPage.goto(campaignSeed.orgId);
    await expect(campaignsListPage.pageContainer).toBeVisible();

    await campaignsListPage.openCampaignDetails(campaign.id);

    await expect(page).toHaveURL(new RegExp(`.*/dashboard/${campaignSeed.orgId}/campaigns/${campaign.id}$`));
    await expect(campaignDetailPage.pageContainer).toBeVisible();
    await expect(campaignDetailPage.title).toContainText(new RegExp(`${campaign.titleUk}|${campaign.titleEn}`));
    await expect(campaignDetailPage.statusBadge).toBeVisible();
  });

  test('TC-03: User can edit an existing campaign details', async ({ page, campaignDetailPage, campaignEditPage, campaignApi, campaignSeed }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Opens campaign edit page, updates fields, and verifies successful PUT update.',
    });

    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Збір для редагування ${Date.now()}`,
      titleEn: `Edit Campaign ${Date.now()}`,
      goalAmount: 45_000,
    });

    await campaignDetailPage.goto(campaignSeed.orgId, campaign.id);
    await campaignDetailPage.openEdit();
    await expect(page).toHaveURL(new RegExp(`.*/dashboard/${campaignSeed.orgId}/campaigns/${campaign.id}/edit$`));
    await expect(campaignEditPage.pageContainer).toBeVisible();

    const updatedTitleUk = `${campaign.titleUk} Оновлено`;
    const updatedTitleEn = `${campaign.titleEn} Updated`;
    await campaignEditPage.fillMainDetails(updatedTitleUk, updatedTitleEn, 'Updated campaign description from E2E');

    const updateResponse = await campaignEditPage.saveAndWaitForUpdate(campaign.id);
    expect(updateResponse.ok()).toBeTruthy();

    await expect(campaignEditPage.successAlert).toBeVisible({ timeout: 10_000 });
    await expect(campaignEditPage.getTitleUkInput()).toHaveValue(updatedTitleUk);
    await expect(campaignEditPage.getTitleEnInput()).toHaveValue(updatedTitleEn);
  });

  test('TC-04: User can change campaign status on edit page', async ({ campaignEditPage, campaignApi, campaignSeed }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Changes campaign status from Draft to Active and verifies status update request success.',
    });

    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Збір зі статусом ${Date.now()}`,
      titleEn: `Status Campaign ${Date.now()}`,
      goalAmount: 35_000,
    });

    await campaignEditPage.goto(campaignSeed.orgId, campaign.id);
    await expect(campaignEditPage.pageContainer).toBeVisible();

    const statusResponse = await campaignEditPage.changeStatusAndWaitForUpdate(campaign.id, 'campaign-edit-status-option-1');
    expect(statusResponse.ok()).toBeTruthy();

    await expect(campaignEditPage.successAlert).toBeVisible({ timeout: 10_000 });
  });

  test('TC-05: Monobank wizard trigger and modal are visible on campaign edit page', async ({ campaignEditPage, campaignApi, campaignSeed }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Opens campaign edit page and verifies Monobank wizard UI controls are visible.',
    });

    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Збір Monobank ${Date.now()}`,
      titleEn: `Monobank Wizard Campaign ${Date.now()}`,
      description: 'Campaign for Monobank wizard E2E tests',
      goalAmount: 250_000,
    });

    await campaignEditPage.goto(campaignSeed.orgId, campaign.id);

    await expect(campaignEditPage.pageContainer).toBeVisible();
    await campaignEditPage.openMonobankWizard();

    await expect(campaignEditPage.monobankWizardDialog).toBeVisible();
    await expect(campaignEditPage.monobankTokenInput).toBeVisible();
    await expect(campaignEditPage.monobankFetchJarsButton).toBeVisible();
    await expect(campaignEditPage.monobankConnectButton).toBeVisible();

    await campaignEditPage.closeMonobankWizard();
    await expect(campaignEditPage.monobankWizardDialog).not.toBeVisible();
  });

  test('TC-06: Dual progress bars are visible on dashboard and public campaign pages', async ({ campaignDetailPage, campaignPublicPage, campaignApi, campaignSeed }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies raised/documented dual progress UI is rendered for campaign detail and public page.',
    });

    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Збір прогресу ${Date.now()}`,
      titleEn: `Progress Campaign ${Date.now()}`,
      goalAmount: 80_000,
    });

    await campaignApi.activateCampaign(campaign.id);
    await campaignDetailPage.goto(campaignSeed.orgId, campaign.id);

    await expect(campaignDetailPage.pageContainer).toBeVisible();
    await expect(campaignDetailPage.raisedProgress).toBeVisible();
    await expect(campaignDetailPage.documentedProgress).toBeVisible();
    await expect(campaignDetailPage.documentedAmount).toBeVisible();

    await campaignPublicPage.goto(campaign.id);
    await expect(campaignPublicPage.header).toBeVisible();
    await expect(campaignPublicPage.raisedProgress).toBeVisible();
    await expect(campaignPublicPage.documentedProgress).toBeVisible();
    await expect(campaignPublicPage.documentedAmount).toBeVisible();
  });

  test('TC-07: Owner can delete campaign from campaigns list', async ({ campaignsListPage, campaignApi, campaignSeed }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Verifies delete action is enabled for owner and campaign can be removed from list via confirmation dialog.',
    });

    const campaign = await campaignApi.createCampaign(campaignSeed.orgId, {
      titleUk: `Збір для видалення ${Date.now()}`,
      titleEn: `Delete Campaign ${Date.now()}`,
      goalAmount: 30_000,
    });

    await campaignsListPage.goto(campaignSeed.orgId);
    await expect(campaignsListPage.pageContainer).toBeVisible();
    await expect(campaignsListPage.getDeleteButton(campaign.id)).toBeEnabled();

    await campaignsListPage.deleteCampaignAndConfirm(campaign.id);

    await expect(campaignsListPage.getCampaignCard(campaign.id)).toHaveCount(0);
  });
});
