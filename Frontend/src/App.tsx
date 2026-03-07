import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryClient';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/Register/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPassword/ForgotPasswordPage';
import ProfilePage from './pages/Profile/ProfilePage';
import ResetPasswordPage from './pages/ResetPassword/ResetPasswordPage';
import AppShell from './components/AppShell';
import { ThemeToggle } from './components/theme-toggle';
import './App.css';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

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
      </BrowserRouter>
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}

export default App;
