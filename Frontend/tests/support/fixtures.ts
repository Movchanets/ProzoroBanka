import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ProfilePage } from "../pages/ProfilePage";
import { HomePage } from "../pages/HomePage";
import { OrganizationPublicPage } from "../pages/OrganizationPublicPage";
import { CampaignPublicPage } from "../pages/CampaignPublicPage";
import { ReceiptPublicPage } from "../pages/ReceiptPublicPage";
import { PublicLayout } from "../pages/PublicLayout";
import { DashboardReceiptsPage } from "../pages/DashboardReceiptsPage";
import { ReceiptsListPage } from "../pages/ReceiptsListPage";
import { ReceiptDetailPage } from "../pages/ReceiptDetailPage";
import { InvitePage } from "../pages/InvitePage";
import { CampaignsListPage } from "../pages/CampaignsListPage";
import { CampaignCreatePage } from "../pages/CampaignCreatePage";
import { CampaignDetailPage } from "../pages/CampaignDetailPage";
import { CampaignEditPage } from "../pages/CampaignEditPage";
import { DashboardHomePage } from "../pages/DashboardHomePage";
import { OrgSettingsPage } from "../pages/OrgSettingsPage";
import { CreateOrgDialog } from "../pages/CreateOrgDialog";
import { OnboardingPage } from "../pages/OnboardingPage";
import { AdminOrganizationsPage } from "../pages/AdminOrganizationsPage";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { AdminRolesPage } from "../pages/AdminRolesPage";
import { AdminSettingsPage } from "../pages/AdminSettingsPage";
import { AdminCampaignCategoriesPage } from "../pages/AdminCampaignCategoriesPage";
import { TeamPage } from "../pages/TeamPage";
import { OrganizationPurchasesPage } from "../pages/OrganizationPurchasesPage";
import { PurchaseDetailPage } from "../pages/PurchaseDetailPage";

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
  receiptsListPage: ReceiptsListPage;
  receiptDetailPage: ReceiptDetailPage;
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
  adminCampaignCategoriesPage: AdminCampaignCategoriesPage;
  teamPage: TeamPage;
  organizationPurchasesPage: OrganizationPurchasesPage;
  purchaseDetailPage: PurchaseDetailPage;
};

export const test = base.extend<AppFixtures>({
  loginPage: async ({ page }, finishFixture) => {
    await finishFixture(new LoginPage(page));
  },
  dashboardPage: async ({ page }, finishFixture) => {
    await finishFixture(new DashboardPage(page));
  },
  profilePage: async ({ page }, finishFixture) => {
    await finishFixture(new ProfilePage(page));
  },
  homePage: async ({ page }, finishFixture) => {
    await finishFixture(new HomePage(page));
  },
  orgPublicPage: async ({ page }, finishFixture) => {
    await finishFixture(new OrganizationPublicPage(page));
  },
  campaignPublicPage: async ({ page }, finishFixture) => {
    await finishFixture(new CampaignPublicPage(page));
  },
  receiptPublicPage: async ({ page }, finishFixture) => {
    await finishFixture(new ReceiptPublicPage(page));
  },
  publicLayout: async ({ page }, finishFixture) => {
    await finishFixture(new PublicLayout(page));
  },
  dashboardReceiptsPage: async ({ page }, finishFixture) => {
    await finishFixture(new DashboardReceiptsPage(page));
  },
  receiptsListPage: async ({ page }, finishFixture) => {
    await finishFixture(new ReceiptsListPage(page));
  },
  receiptDetailPage: async ({ page }, finishFixture) => {
    await finishFixture(new ReceiptDetailPage(page));
  },
  invitePage: async ({ page }, finishFixture) => {
    await finishFixture(new InvitePage(page));
  },
  campaignsListPage: async ({ page }, finishFixture) => {
    await finishFixture(new CampaignsListPage(page));
  },
  campaignCreatePage: async ({ page }, finishFixture) => {
    await finishFixture(new CampaignCreatePage(page));
  },
  campaignDetailPage: async ({ page }, finishFixture) => {
    await finishFixture(new CampaignDetailPage(page));
  },
  campaignEditPage: async ({ page }, finishFixture) => {
    await finishFixture(new CampaignEditPage(page));
  },
  dashboardHomePage: async ({ page }, finishFixture) => {
    await finishFixture(new DashboardHomePage(page));
  },
  orgSettingsPage: async ({ page }, finishFixture) => {
    await finishFixture(new OrgSettingsPage(page));
  },
  createOrgDialog: async ({ page }, finishFixture) => {
    await finishFixture(new CreateOrgDialog(page));
  },
  onboardingPage: async ({ page }, finishFixture) => {
    await finishFixture(new OnboardingPage(page));
  },
  adminOrganizationsPage: async ({ page }, finishFixture) => {
    await finishFixture(new AdminOrganizationsPage(page));
  },
  adminUsersPage: async ({ page }, finishFixture) => {
    await finishFixture(new AdminUsersPage(page));
  },
  adminRolesPage: async ({ page }, finishFixture) => {
    await finishFixture(new AdminRolesPage(page));
  },
  adminSettingsPage: async ({ page }, finishFixture) => {
    await finishFixture(new AdminSettingsPage(page));
  },
  adminCampaignCategoriesPage: async ({ page }, finishFixture) => {
    await finishFixture(new AdminCampaignCategoriesPage(page));
  },
  teamPage: async ({ page }, finishFixture) => {
    await finishFixture(new TeamPage(page));
  },
  organizationPurchasesPage: async ({ page }, finishFixture) => {
    await finishFixture(new OrganizationPurchasesPage(page));
  },
  purchaseDetailPage: async ({ page }, finishFixture) => {
    await finishFixture(new PurchaseDetailPage(page));
  },
});

export { expect } from "@playwright/test";
