import { AppRoles, hasAppRole } from '@/constants/appRoles'
import { useAuthStore } from '@/stores/authStore'
import RootLayout from '@/components/routing/RootLayout'
import {
  createRootRoute,
  createRoute,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router'

type AuthSearch = {
  next?: string
}

type AdminUsersSearch = {
  page?: string
  status?: 'active' | 'locked'
  role?: string
  search?: string
}

const validateAuthSearch = (search: Record<string, unknown>): AuthSearch => {
  const next = typeof search.next === 'string' && search.next.startsWith('/') ? search.next : undefined

  return { next }
}

const validateAdminUsersSearch = (search: Record<string, unknown>): AdminUsersSearch => {
  const pageValue = typeof search.page === 'string' ? search.page : undefined
  const parsedPage = pageValue ? Number(pageValue) : NaN
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? pageValue : undefined

  const statusValue = typeof search.status === 'string' ? search.status : undefined
  const status = statusValue === 'active' || statusValue === 'locked' ? statusValue : undefined

  const role = typeof search.role === 'string' && search.role.trim() ? search.role.trim() : undefined
  const searchValue = typeof search.search === 'string' && search.search.trim() ? search.search.trim() : undefined

  return {
    page,
    status,
    role,
    search: searchValue,
  }
}

const requireAuthenticated = ({ location }: { location: { href: string } }) => {
  if (!useAuthStore.getState().isAuthenticated) {
    throw redirect({
      to: '/login',
      replace: true,
      search: {
        next: location.href,
      },
    })
  }
}

const requireGuest = () => {
  if (useAuthStore.getState().isAuthenticated) {
    throw redirect({
      to: '/onboarding',
      replace: true,
    })
  }
}

const requireAdmin = ({ location }: { location: { href: string } }) => {
  const auth = useAuthStore.getState()

  if (!auth.isAuthenticated) {
    throw redirect({
      to: '/login',
      replace: true,
      search: {
        next: location.href,
      },
    })
  }

  if (!hasAppRole(auth.user?.roles, AppRoles.Admin)) {
    throw redirect({
      to: '/',
      replace: true,
    })
  }
}

const rootRoute = createRootRoute({
  component: RootLayout,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: validateAuthSearch,
  beforeLoad: requireGuest,
  component: lazyRouteComponent(() => import('./pages/Login/LoginPage')),
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  beforeLoad: requireGuest,
  component: lazyRouteComponent(() => import('./pages/Register/RegisterPage')),
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  beforeLoad: requireGuest,
  component: lazyRouteComponent(() => import('./pages/ForgotPassword/ForgotPasswordPage')),
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : undefined,
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  beforeLoad: requireGuest,
  component: lazyRouteComponent(() => import('./pages/ResetPassword/ResetPasswordPage')),
})

const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invite/$token',
  component: lazyRouteComponent(() => import('./pages/Invite/InvitePage')),
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: lazyRouteComponent(() => import('./pages/Home/HomePage')),
})

const publicOrganizationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/o/$slug',
  component: lazyRouteComponent(() => import('./pages/PublicOrganization/PublicOrganizationPage')),
})

const publicCampaignRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/c/$id',
  component: lazyRouteComponent(() => import('./pages/PublicCampaign/PublicCampaignPage')),
})

const publicReceiptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/receipt/$id',
  component: lazyRouteComponent(() => import('./pages/PublicReceipt/PublicReceiptPlaceholderPage')),
})

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  beforeLoad: requireAuthenticated,
  component: lazyRouteComponent(() => import('./pages/Onboarding/OnboardingPage')),
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: requireAuthenticated,
  component: lazyRouteComponent(() => import('./pages/Profile/ProfileShellPage')),
})

const dashboardRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: () => {
    requireAuthenticated({ location: { href: '/dashboard' } })
    throw redirect({
      to: '/onboarding',
      replace: true,
    })
  },
})

const dashboardOrgRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard/$orgId',
  beforeLoad: requireAuthenticated,
  component: lazyRouteComponent(() => import('./components/DashboardLayout')),
})

const dashboardHomeRoute = createRoute({
  getParentRoute: () => dashboardOrgRoute,
  path: '/',
  component: lazyRouteComponent(() => import('./pages/Dashboard/DashboardHomePage')),
})

const orgSettingsRoute = createRoute({
  getParentRoute: () => dashboardOrgRoute,
  path: 'settings',
  component: lazyRouteComponent(() => import('./pages/Dashboard/OrgSettingsPage')),
})

const teamRoute = createRoute({
  getParentRoute: () => dashboardOrgRoute,
  path: 'team',
  component: lazyRouteComponent(() => import('./pages/Dashboard/TeamPage')),
})

const campaignsListRoute = createRoute({
  getParentRoute: () => dashboardOrgRoute,
  path: 'campaigns',
  component: lazyRouteComponent(() => import('./pages/Dashboard/CampaignsListPage')),
})

const campaignCreateRoute = createRoute({
  getParentRoute: () => dashboardOrgRoute,
  path: 'campaigns/new',
  component: lazyRouteComponent(() => import('./pages/Dashboard/CampaignCreatePage')),
})

const campaignDetailRoute = createRoute({
  getParentRoute: () => dashboardOrgRoute,
  path: 'campaigns/$campaignId',
  component: lazyRouteComponent(() => import('./pages/Dashboard/CampaignDetailPage')),
})

const campaignEditRoute = createRoute({
  getParentRoute: () => dashboardOrgRoute,
  path: 'campaigns/$campaignId/edit',
  component: lazyRouteComponent(() => import('./pages/Dashboard/CampaignEditPage')),
})

const receiptsListRoute = createRoute({
  getParentRoute: () => dashboardOrgRoute,
  path: 'receipts',
  component: lazyRouteComponent(() => import('./pages/Dashboard/ReceiptsListPage')),
})

const receiptCreateRoute = createRoute({
  getParentRoute: () => dashboardOrgRoute,
  path: 'receipts/new',
  component: lazyRouteComponent(() => import('./pages/Dashboard/ReceiptDetailPage')),
})

const receiptDetailRoute = createRoute({
  getParentRoute: () => dashboardOrgRoute,
  path: 'receipts/$receiptId',
  component: lazyRouteComponent(() => import('./pages/Dashboard/ReceiptDetailPage')),
})

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: requireAdmin,
  component: lazyRouteComponent(() => import('./pages/Admin/AdminLayout')),
})

const adminIndexRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({
      to: '/admin/organizations',
      replace: true,
    })
  },
})

const adminOrganizationsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'organizations',
  component: lazyRouteComponent(() => import('./pages/Admin/AdminOrganizationsPage')),
})

const adminCampaignsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'organizations/$orgId/campaigns',
  component: lazyRouteComponent(() => import('./pages/Admin/AdminCampaignsPage')),
})

const adminCampaignCategoriesRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'campaign-categories',
  component: lazyRouteComponent(() => import('./pages/Admin/AdminCampaignCategoriesPage')),
})

const adminUsersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'users',
  validateSearch: validateAdminUsersSearch,
  component: lazyRouteComponent(() => import('./pages/Admin/AdminUsersPage')),
})

const adminRolesRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'roles',
  component: lazyRouteComponent(() => import('./pages/Admin/AdminRolesPage')),
})

const adminSettingsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'settings',
  component: lazyRouteComponent(() => import('./pages/Admin/AdminSettingsPage')),
})

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  component: lazyRouteComponent(() => import('./pages/NotFound/NotFoundPage')),
})

export const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  inviteRoute,
  homeRoute,
  publicOrganizationRoute,
  publicCampaignRoute,
  publicReceiptRoute,
  onboardingRoute,
  profileRoute,
  dashboardRedirectRoute,
  dashboardOrgRoute.addChildren([
    dashboardHomeRoute,
    orgSettingsRoute,
    teamRoute,
    campaignsListRoute,
    campaignCreateRoute,
    campaignDetailRoute,
    campaignEditRoute,
    receiptsListRoute,
    receiptCreateRoute,
    receiptDetailRoute,
  ]),
  adminRoute.addChildren([
    adminIndexRoute,
    adminOrganizationsRoute,
    adminCampaignsRoute,
    adminCampaignCategoriesRoute,
    adminUsersRoute,
    adminRolesRoute,
    adminSettingsRoute,
  ]),
  notFoundRoute,
])