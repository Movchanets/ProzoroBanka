import { Navigate, Outlet } from "react-router";
import { AppLoadingFallback } from "@/components/AppLoadingFallback";
import { AppRoles, hasAppRole } from "@/constants/appRoles";
import { useAuthStore } from "@/stores/authStore";

export default function AdminGuard() {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const userRoles = useAuthStore((state) => state.user?.roles);

  if (!hasHydrated) {
    return <AppLoadingFallback />;
  }

  if (!hasAppRole(userRoles, AppRoles.Admin)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
