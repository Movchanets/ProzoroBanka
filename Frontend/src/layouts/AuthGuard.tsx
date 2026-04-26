import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthNavigation } from '@/hooks/useAuthNavigation';

export default function AuthGuard() {
  const location = useLocation();
  const { isAuthenticated, isResolvingSession } = useAuthNavigation();

  if (!isAuthenticated && !isResolvingSession) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (isResolvingSession) {
    return null;
  }

  return <Outlet />;
}
