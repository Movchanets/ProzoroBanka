import { Navigate, Outlet } from 'react-router';
import { useAuthNavigation } from '@/hooks/useAuthNavigation';

export default function GuestGuard() {
  const { isAuthenticated, isResolvingSession, defaultAuthenticatedPath } = useAuthNavigation();

  if (isAuthenticated && !isResolvingSession) {
    return <Navigate to={defaultAuthenticatedPath} replace />;
  }

  if (isResolvingSession) {
    return null;
  }

  return <Outlet />;
}
