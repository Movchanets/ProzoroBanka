import { Navigate } from "react-router";
import { AppLoadingFallback } from "@/components/AppLoadingFallback";
import { useMyOrganizations } from "@/hooks/queries/useOrganizations";
import { useAuthStore } from "@/stores/authStore";

export default function DashboardEntryPage() {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const organizationsQuery = useMyOrganizations({
    enabled: hasHydrated && isAuthenticated,
  });

  if (!hasHydrated || organizationsQuery.isLoading) {
    return <AppLoadingFallback />;
  }

  const organizations = organizationsQuery.data ?? [];
  const targetPath =
    organizations.length > 0
      ? `/dashboard/${organizations[0].id}`
      : "/onboarding";

  return <Navigate to={targetPath} replace />;
}
