import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { AppRoles, hasAppRole } from '@/constants/appRoles';

export default function AdminGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userRoles = useAuthStore((s) => s.user?.roles);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAppRole(userRoles, AppRoles.Admin)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
