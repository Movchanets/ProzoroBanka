import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthNavigation } from '@/hooks/useAuthNavigation';
import { AppLoadingFallback } from '@/components/AppLoadingFallback';

export default function AuthGuard() {
  const location = useLocation();
  const { _hasHydrated, isAuthenticated, isResolvingSession } = useAuthNavigation();

  if (!_hasHydrated || isResolvingSession) {
    return <AppLoadingFallback />;
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}
