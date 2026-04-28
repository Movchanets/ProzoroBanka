import { Navigate, Outlet, useLocation } from "react-router";
import { AppLoadingFallback } from "@/components/AppLoadingFallback";
import { useAuthStore } from "@/stores/authStore";

export default function AuthGuard() {
  const location = useLocation();
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!hasHydrated) {
    return <AppLoadingFallback />;
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}
