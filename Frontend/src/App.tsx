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
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
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
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
            <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <ProfilePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route path="/profile" element={<Navigate to="/" replace />} />
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
