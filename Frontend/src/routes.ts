import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  // Guest routes
  layout("layouts/GuestGuard.tsx", [
    route("login", "pages/Login/LoginPage.tsx"),
    route("register", "pages/Register/RegisterPage.tsx"),
    route("forgot-password", "pages/ForgotPassword/ForgotPasswordPage.tsx"),
    route("reset-password", "pages/ResetPassword/ResetPasswordPage.tsx"),
  ]),

  // Public invite page
  route("invite/:token", "pages/Invite/InvitePage.tsx"),

  // Public pages
  layout("layouts/PublicLayout.tsx", [
    index("pages/Home/HomePage.tsx"),
    route("o/:slug", "pages/PublicOrganization/PublicOrganizationPage.tsx"),
    route("c/:id", "pages/PublicCampaign/PublicCampaignPage.tsx"),
    route("receipt/:id", "pages/PublicReceipt/PublicReceiptPlaceholderPage.tsx"),
    route("spending/:id", "pages/PublicSpending/PublicSpendingPage.tsx"),
  ]),

  // Protected routes
  layout("layouts/AuthGuard.tsx", [
    route("onboarding", "pages/Onboarding/OnboardingPage.tsx"),
    
    layout("components/AppShell.tsx", [
      route("profile", "pages/Profile/ProfilePage.tsx"),
    ]),

    // Dashboard Entry
    route("dashboard", "pages/Dashboard/DashboardEntryPage.tsx"),

    // Dashboard Organization routes
    route("dashboard/:orgId", "components/DashboardLayout.tsx", [
      index("pages/Dashboard/DashboardHomePage.tsx"),
      route("settings", "pages/Dashboard/OrgSettingsPage.tsx"),
      route("team", "pages/Dashboard/TeamPage.tsx"),
      route("purchases", "pages/Dashboard/OrganizationPurchasesPage.tsx"),
      route("purchases/:purchaseId", "pages/Dashboard/PurchaseDetailPage.tsx", { id: "purchase-detail-org" }),
      route("campaigns", "pages/Dashboard/CampaignsListPage.tsx"),
      route("campaigns/new", "pages/Dashboard/CampaignCreatePage.tsx"),
      route("campaigns/:campaignId", "pages/Dashboard/CampaignDetailPage.tsx"),
      route("campaigns/:campaignId/edit", "pages/Dashboard/CampaignEditPage.tsx"),
      route("campaigns/:campaignId/purchases", "pages/Dashboard/CampaignPurchasesListPage.tsx"),
      route("campaigns/:campaignId/purchases/new", "pages/Dashboard/PurchaseDetailPage.tsx", { id: "purchase-detail-campaign-new" }),
      route("campaigns/:campaignId/purchases/:purchaseId", "pages/Dashboard/PurchaseDetailPage.tsx", { id: "purchase-detail-campaign" }),
      route("receipts", "pages/Dashboard/ReceiptsListPage.tsx"),
      route("receipts/new", "pages/Dashboard/ReceiptCreatePage.tsx"),
      route("receipts/:receiptId", "pages/Dashboard/ReceiptDetailPage.tsx"),
    ]),

    // Admin routes
    layout("layouts/AdminGuard.tsx", [
      route("admin", "pages/Admin/AdminLayout.tsx", [
        index("pages/Admin/AdminOrganizationsRedirect.tsx"),
        route("organizations", "pages/Admin/AdminOrganizationsPage.tsx"),
        route("organizations/:orgId/campaigns", "pages/Admin/AdminCampaignsPage.tsx"),
        route("campaign-categories", "pages/Admin/AdminCampaignCategoriesPage.tsx"),
        route("users", "pages/Admin/AdminUsersPage.tsx"),
        route("roles", "pages/Admin/AdminRolesPage.tsx"),
        route("settings", "pages/Admin/AdminSettingsPage.tsx"),
      ]),
    ]),
  ]),

  // 404
  route("*", "pages/NotFound/NotFoundPage.tsx"),
] satisfies RouteConfig;
