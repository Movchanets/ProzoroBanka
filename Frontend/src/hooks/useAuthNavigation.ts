import { useEffect, useMemo } from 'react';
import { useProfileQuery } from './queries/useProfile';
import { useMyOrganizations } from './queries/useOrganizations';
import { useAuthStore } from '@/stores/authStore';

export function useAuthNavigation() {
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const updateUser = useAuthStore((state) => state.updateUser);

  const profileQuery = useProfileQuery();
  const organizationsQuery = useMyOrganizations({ enabled: isAuthenticated });

  useEffect(() => {
    if (profileQuery.data) {
      updateUser(profileQuery.data);
    }
  }, [profileQuery.data, updateUser]);

  const isResolvingSession = isAuthenticated
    && (profileQuery.isLoading || organizationsQuery.isLoading);

  const organizations = useMemo(
    () => organizationsQuery.data ?? [],
    [organizationsQuery.data],
  );

  const defaultAuthenticatedPath = organizations.length > 0
    ? `/dashboard/${organizations[0].id}`
    : '/onboarding';

  return {
    _hasHydrated,
    isAuthenticated,
    isResolvingSession,
    organizations,
    hasOrganizations: organizations.length > 0,
    defaultAuthenticatedPath,
    profileQuery,
    organizationsQuery,
  };
}
