import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryClient';
import { useAuthStore } from './stores/authStore';
import { ThemeToggle } from './components/theme-toggle';

const LoginPage = lazy(() => import('./pages/Login/LoginPage'));
const RegisterPage = lazy(() => import('./pages/Register/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword/ResetPasswordPage'));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'));
const AppShell = lazy(() => import('./components/AppShell'));
const OnboardingPage = lazy(() => import('./pages/Onboarding/OnboardingPage'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const DashboardHomePage = lazy(() => import('./pages/Dashboard/DashboardHomePage'));
const OrgSettingsPage = lazy(() => import('./pages/Dashboard/OrgSettingsPage'));
const TeamPage = lazy(() => import('./pages/Dashboard/TeamPage'));
const CampaignsListPage = lazy(() => import('./pages/Dashboard/CampaignsListPage'));
const CampaignCreatePage = lazy(() => import('./pages/Dashboard/CampaignCreatePage'));
const CampaignEditPage = lazy(() => import('./pages/Dashboard/CampaignEditPage'));
const ReceiptsPlaceholderPage = lazy(() => import('./pages/Dashboard/ReceiptsPlaceholderPage'));
const InvitePage = lazy(() => import('./pages/Invite/InvitePage'));
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() => import('@tanstack/react-query-devtools').then((module) => ({ default: module.ReactQueryDevtools })))
  : null;

function RouteFallback() {
  return (
    <div className="mx-auto flex min-h-screen w-[min(1180px,calc(100%-32px))] items-center justify-center py-8 max-sm:w-[min(1180px,calc(100%-20px))]">
      <div className="rounded-4xl border border-border bg-card/80 px-6 py-4 text-sm font-semibold text-muted-foreground shadow-[0_24px_80px_var(--shadow-soft)] backdrop-blur-xl">
        Завантаження інтерфейсу...
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/onboarding" replace /> : <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="fixed right-4 top-4 z-50 flex pointer-events-none md:right-6 md:top-6">
          <div className="pointer-events-auto">
            <ThemeToggle />
          </div>
        </div>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Guest routes */}
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
            <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

            {/* Public invite page (redirects to login if not auth) */}
            <Route path="/invite/:token" element={<InvitePage />} />

            {/* Onboarding — redirect to dashboard if has orgs */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            {/* Profile (legacy location — standalone AppShell) */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <ProfilePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Dashboard routes */}
            <Route
              path="/dashboard/:orgId"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHomePage />} />
              <Route path="settings" element={<OrgSettingsPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="campaigns" element={<CampaignsListPage />} />
              <Route path="campaigns/new" element={<CampaignCreatePage />} />
              <Route path="campaigns/:campaignId/edit" element={<CampaignEditPage />} />
              <Route path="receipts" element={<ReceiptsPlaceholderPage />} />
            </Route>

            {/* Root → onboarding (will auto-redirect to dashboard if has orgs) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Navigate to="/onboarding" replace />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      {ReactQueryDevtools ? (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  );
}

export default App;
