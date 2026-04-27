import { Navigate, Outlet } from 'react-router';
import { useAuthNavigation } from '@/hooks/useAuthNavigation';
import { AppLoadingFallback } from '@/components/AppLoadingFallback';

export default function GuestGuard() {
  const { _hasHydrated, isAuthenticated, isResolvingSession, defaultAuthenticatedPath } = useAuthNavigation();

  if (!_hasHydrated || isResolvingSession) {
    return <AppLoadingFallback />;
  }

  if (isAuthenticated) {
    return <Navigate to={defaultAuthenticatedPath} replace />;
  }

  return <Outlet />;
}
