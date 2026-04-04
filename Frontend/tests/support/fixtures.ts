import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProfilePage } from '../pages/ProfilePage';
import { HomePage } from '../pages/HomePage';
import { OrganizationPublicPage } from '../pages/OrganizationPublicPage';
import { CampaignPublicPage } from '../pages/CampaignPublicPage';
import { ReceiptPublicPage } from '../pages/ReceiptPublicPage';
import { PublicLayout } from '../pages/PublicLayout';
import { DashboardReceiptsPage } from '../pages/DashboardReceiptsPage';
import { InvitePage } from '../pages/InvitePage';
import { CampaignsListPage } from '../pages/CampaignsListPage';
import { CampaignCreatePage } from '../pages/CampaignCreatePage';
import { CampaignDetailPage } from '../pages/CampaignDetailPage';
import { CampaignEditPage } from '../pages/CampaignEditPage';
import { DashboardHomePage } from '../pages/DashboardHomePage';
import { OrgSettingsPage } from '../pages/OrgSettingsPage';
import { CreateOrgDialog } from '../pages/CreateOrgDialog';
import { OnboardingPage } from '../pages/OnboardingPage';
import { AdminOrganizationsPage } from '../pages/AdminOrganizationsPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { AdminRolesPage } from '../pages/AdminRolesPage';
import { AdminSettingsPage } from '../pages/AdminSettingsPage';
import { TeamPage } from '../pages/TeamPage';

type AppFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  profilePage: ProfilePage;
  homePage: HomePage;
  orgPublicPage: OrganizationPublicPage;
  campaignPublicPage: CampaignPublicPage;
  receiptPublicPage: ReceiptPublicPage;
  publicLayout: PublicLayout;
  dashboardReceiptsPage: DashboardReceiptsPage;
  invitePage: InvitePage;
  campaignsListPage: CampaignsListPage;
  campaignCreatePage: CampaignCreatePage;
  campaignDetailPage: CampaignDetailPage;
  campaignEditPage: CampaignEditPage;
  dashboardHomePage: DashboardHomePage;
  orgSettingsPage: OrgSettingsPage;
  createOrgDialog: CreateOrgDialog;
  onboardingPage: OnboardingPage;
  adminOrganizationsPage: AdminOrganizationsPage;
  adminUsersPage: AdminUsersPage;
  adminRolesPage: AdminRolesPage;
  adminSettingsPage: AdminSettingsPage;
  teamPage: TeamPage;
};

export const test = base.extend<AppFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  orgPublicPage: async ({ page }, use) => {
    await use(new OrganizationPublicPage(page));
  },
  campaignPublicPage: async ({ page }, use) => {
    await use(new CampaignPublicPage(page));
  },
  receiptPublicPage: async ({ page }, use) => {
    await use(new ReceiptPublicPage(page));
  },
  publicLayout: async ({ page }, use) => {
    await use(new PublicLayout(page));
  },
  dashboardReceiptsPage: async ({ page }, use) => {
    await use(new DashboardReceiptsPage(page));
  },
  invitePage: async ({ page }, use) => {
    await use(new InvitePage(page));
  },
  campaignsListPage: async ({ page }, use) => {
    await use(new CampaignsListPage(page));
  },
  campaignCreatePage: async ({ page }, use) => {
    await use(new CampaignCreatePage(page));
  },
  campaignDetailPage: async ({ page }, use) => {
    await use(new CampaignDetailPage(page));
  },
  campaignEditPage: async ({ page }, use) => {
    await use(new CampaignEditPage(page));
  },
  dashboardHomePage: async ({ page }, use) => {
    await use(new DashboardHomePage(page));
  },
  orgSettingsPage: async ({ page }, use) => {
    await use(new OrgSettingsPage(page));
  },
  createOrgDialog: async ({ page }, use) => {
    await use(new CreateOrgDialog(page));
  },
  onboardingPage: async ({ page }, use) => {
    await use(new OnboardingPage(page));
  },
  adminOrganizationsPage: async ({ page }, use) => {
    await use(new AdminOrganizationsPage(page));
  },
  adminUsersPage: async ({ page }, use) => {
    await use(new AdminUsersPage(page));
  },
  adminRolesPage: async ({ page }, use) => {
    await use(new AdminRolesPage(page));
  },
  adminSettingsPage: async ({ page }, use) => {
    await use(new AdminSettingsPage(page));
  },
  teamPage: async ({ page }, use) => {
    await use(new TeamPage(page));
  },
});

export { expect } from '@playwright/test';
