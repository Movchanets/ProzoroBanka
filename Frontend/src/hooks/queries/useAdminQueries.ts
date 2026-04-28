import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../services/api';
import type { ServiceResponse, CampaignStatus } from '../../types';
import type {
  AdminOrganizationListResponse,
  AdminCampaignDto,
  AdminUserListResponse,
  AdminUserDetailsDto,
  AdminGeneralSettingsDto,
  AdminPlansSettingsDto,
  AdminUserLimitsSettingsDto,
  AdminRoleDto,
  AdminUsersFilters,
  OrganizationPlanType,
  OrganizationPlanUsageDto,
  AdminCampaignCategoryDto,
  AdminCampaignCategoryPayload,
} from '../../types/admin';
import { toast } from 'sonner';
import { adminOcrService } from '../../services/adminOcrService';
import { profileService } from '../../services/profileService';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { TokenResponse } from '../../types/domains/auth';

export const adminQueryKeys = {
  organizations: (page: number, verifiedOnly?: boolean, search?: string) => ['admin', 'organizations', page, verifiedOnly, search] as const,
  organizationCampaigns: (orgId: string, page: number) => ['admin', 'organizations', orgId, 'campaigns', page] as const,
  organizationPlanUsage: (orgId: string) => ['admin', 'organizations', orgId, 'plan-usage'] as const,
  users: (page: number, filters?: AdminUsersFilters) => ['admin', 'users', page, filters] as const,
  userDetails: (userId: string) => ['admin', 'users', userId, 'details'] as const,
  userLimitsSettings: () => ['admin', 'settings', 'users'] as const,
  plansSettings: () => ['admin', 'settings', 'plans'] as const,
  generalSettings: () => ['admin', 'settings', 'general'] as const,
  roles: () => ['admin', 'roles'] as const,
  campaignCategories: () => ['admin', 'campaign-categories'] as const,
  ocrModels: () => ['admin', 'settings', 'ocr-models'] as const,
};

export function useAdminOrganizations(page: number, verifiedOnly?: boolean, search?: string) {
  return useQuery(getAdminOrganizationsOptions(page, verifiedOnly, search));
}

export const getAdminOrganizationsOptions = (page: number, verifiedOnly?: boolean, search?: string) => ({
  queryKey: adminQueryKeys.organizations(page, verifiedOnly, search),
  queryFn: () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const url = new URL('/api/admin/organizations', origin);
    url.searchParams.set('page', page.toString());
    if (verifiedOnly !== undefined && verifiedOnly !== null) {
      url.searchParams.set('verifiedOnly', String(verifiedOnly));
    }
    if (search?.trim()) {
      url.searchParams.set('search', search.trim());
    }
    return apiFetch<AdminOrganizationListResponse>(url.pathname + url.search);
  },
});

export function useAdminOrganizationPlanUsage(orgId: string | null) {
  return useQuery({
    ...getAdminOrganizationPlanUsageOptions(orgId),
    enabled: !!orgId,
  });
}

export const getAdminOrganizationPlanUsageOptions = (orgId: string | null) => ({
  queryKey: adminQueryKeys.organizationPlanUsage(orgId ?? ''),
  queryFn: () => apiFetch<ServiceResponse<OrganizationPlanUsageDto>>(`/api/admin/organizations/${orgId}/plan-usage`),
});

export function useAdminSetOrganizationPlan(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planType: OrganizationPlanType) =>
      apiFetch<ServiceResponse<null>>(`/api/admin/organizations/${orgId}/plan`, {
        method: 'PUT',
        body: JSON.stringify({ planType }),
      }),
    onSuccess: () => {
      toast.success('Тариф організації оновлено');
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.organizationPlanUsage(orgId ?? '') });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminVerifyOrganization(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isVerified: boolean) =>
      apiFetch<ServiceResponse<{ message: string }>>(`/api/admin/organizations/${organizationId}/verify`, {
        method: 'PUT',
        body: JSON.stringify({ isVerified }),
      }),
    onSuccess: () => {
      toast.success('Статус верифікації оновлено');
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminDeleteOrganization(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ServiceResponse<{ message: string }>>(`/api/admin/organizations/${organizationId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Організацію видалено');
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminBlockOrganization(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      apiFetch<ServiceResponse<{ message: string }>>(`/api/admin/organizations/${organizationId}/block`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      toast.success('Організацію заблоковано');
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminUnblockOrganization(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ServiceResponse<{ message: string }>>(`/api/admin/organizations/${organizationId}/unblock`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast.success('Організацію розблоковано');
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminOrganizationCampaigns(orgId: string, page: number) {
  return useQuery({
    ...getAdminOrganizationCampaignsOptions(orgId, page),
    enabled: !!orgId,
  });
}

export const getAdminOrganizationCampaignsOptions = (orgId: string, page: number) => ({
  queryKey: adminQueryKeys.organizationCampaigns(orgId, page),
  queryFn: () =>
    apiFetch<AdminCampaignDto[]>(`/api/admin/organizations/${orgId}/campaigns?page=${page}`),
});

export function useAdminChangeCampaignStatus(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newStatus: CampaignStatus) =>
      apiFetch<ServiceResponse<{ message: string }>>(`/api/admin/campaigns/${campaignId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ newStatus }),
      }),
    onSuccess: () => {
      toast.success('Статус збору оновлено');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminCampaignCategories(includeInactive = true) {
  return useQuery(getAdminCampaignCategoriesOptions(includeInactive));
}

export const getAdminCampaignCategoriesOptions = (includeInactive = true) => ({
  queryKey: [...adminQueryKeys.campaignCategories(), includeInactive],
  queryFn: () => apiFetch<AdminCampaignCategoryDto[]>(`/api/admin/campaign-categories?includeInactive=${String(includeInactive)}`),
});

export function useAdminCreateCampaignCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminCampaignCategoryPayload) =>
      apiFetch<AdminCampaignCategoryDto>('/api/admin/campaign-categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success('Категорію створено');
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.campaignCategories() });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminUpdateCampaignCategory(categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminCampaignCategoryPayload) =>
      apiFetch<AdminCampaignCategoryDto>(`/api/admin/campaign-categories/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success('Категорію оновлено');
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.campaignCategories() });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminDeleteCampaignCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) =>
      apiFetch<{ message: string }>(`/api/admin/campaign-categories/${categoryId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Категорію видалено');
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.campaignCategories() });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminUsers(page: number, filters?: AdminUsersFilters) {
  return useQuery(getAdminUsersOptions(page, filters));
}

export const getAdminUsersOptions = (page: number, filters?: AdminUsersFilters) => ({
  queryKey: adminQueryKeys.users(page, filters),
  queryFn: () => {
    const params = new URLSearchParams();
    params.set('page', String(page));

    if (filters?.search) {
      params.set('search', filters.search);
    }

    if (typeof filters?.isActive === 'boolean') {
      params.set('isActive', String(filters.isActive));
    }

    if (filters?.role) {
      params.set('role', filters.role);
    }

    return apiFetch<AdminUserListResponse>(`/api/admin/users?${params.toString()}`);
  },
});

export function useAdminRoles() {
  return useQuery(getAdminRolesOptions());
}

export const getAdminRolesOptions = () => ({
  queryKey: adminQueryKeys.roles(),
  queryFn: () => apiFetch<AdminRoleDto[]>('/api/admin/roles'),
});

export function useAdminUserDetails(userId: string | null) {
  return useQuery({
    ...getAdminUserDetailsOptions(userId),
    enabled: !!userId,
  });
}

export const getAdminUserDetailsOptions = (userId: string | null) => ({
  queryKey: adminQueryKeys.userDetails(userId ?? ''),
  queryFn: () => apiFetch<AdminUserDetailsDto>(`/api/admin/users/${userId}`),
});

export function useAdminUserLimitsSettings() {
  return useQuery(getAdminUserLimitsSettingsOptions());
}

export const getAdminUserLimitsSettingsOptions = () => ({
  queryKey: adminQueryKeys.userLimitsSettings(),
  queryFn: () => apiFetch<AdminUserLimitsSettingsDto>('/api/admin/settings/users'),
});

export function useAdminUpdateUserLimitsSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (maxOwnedOrganizationsForNonAdmin: number) =>
      apiFetch<AdminUserLimitsSettingsDto>('/api/admin/settings/users', {
        method: 'PUT',
        body: JSON.stringify({ maxOwnedOrganizationsForNonAdmin }),
      }),
    onSuccess: () => {
      toast.success('Глобальний ліміт організацій оновлено');
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.userLimitsSettings() });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminPlansSettings() {
  return useQuery(getAdminPlansSettingsOptions());
}

export const getAdminPlansSettingsOptions = () => ({
  queryKey: adminQueryKeys.plansSettings(),
  queryFn: () => apiFetch<AdminPlansSettingsDto>('/api/admin/settings/plans'),
});

export function useAdminUpdatePlansSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminPlansSettingsDto) =>
      apiFetch<AdminPlansSettingsDto>('/api/admin/settings/plans', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success('Ліміти тарифів оновлено');
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.plansSettings() });
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminGeneralSettings() {
  return useQuery(getAdminGeneralSettingsOptions());
}

export const getAdminGeneralSettingsOptions = () => ({
  queryKey: adminQueryKeys.generalSettings(),
  queryFn: () => apiFetch<AdminGeneralSettingsDto>('/api/admin/settings/general'),
});

export function useAdminOcrModels() {
  return useQuery(getAdminOcrModelsOptions());
}

export const getAdminOcrModelsOptions = () => ({
  queryKey: adminQueryKeys.ocrModels(),
  queryFn: () => adminOcrService.list(),
});

export function useAdminUpdateGeneralSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminGeneralSettingsDto) =>
      apiFetch<AdminGeneralSettingsDto>('/api/admin/settings/general', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success('Глобальні змінні оновлено');
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.generalSettings() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.userLimitsSettings() });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminAssignRoles(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roles: string[]) =>
      apiFetch<ServiceResponse<{ message: string }>>(`/api/admin/users/${userId}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ roles }),
      }),
    onSuccess: () => {
      toast.success('Ролі успішно оновлені');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminSetUserLockout(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locked: boolean) =>
      apiFetch<ServiceResponse<{ message: string }>>(`/api/admin/users/${userId}/lockout`, {
        method: 'PUT',
        body: JSON.stringify({ locked }),
      }),
    onSuccess: (_, locked) => {
      toast.success(locked ? 'Користувача заблоковано' : 'Користувача розблоковано');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminDeleteUser(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<ServiceResponse<{ message: string }>>(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Користувача видалено');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminImpersonateUser() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setTokens = useAuthStore((state) => state.setTokens);
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<TokenResponse>(`/api/admin/users/${userId}/impersonate`, {
        method: 'POST',
      }),
    onSuccess: async (tokens) => {
      setTokens(tokens.accessToken, tokens.refreshToken, tokens.accessTokenExpiry);

      try {
        const profile = await profileService.getProfile();

        useWorkspaceStore.getState().clearActiveOrg();
        queryClient.clear();
        setAuth(tokens.accessToken, tokens.refreshToken, tokens.accessTokenExpiry, profile);
        toast.success('Сесію переключено. Щоб повернутись до адмін-акаунта, виконайте вихід і увійдіть повторно.');
      } catch {
        logout();
        useWorkspaceStore.getState().clearActiveOrg();
        queryClient.clear();
        throw new Error('Не вдалося завантажити профіль після impersonation. Виконайте повторний вхід.');
      }
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminUpdateUserOrganizationLink(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ organizationId, role, permissions }: { organizationId: string; role: number; permissions: number }) =>
      apiFetch(`/api/admin/users/${userId}/organizations/${organizationId}`, {
        method: 'PUT',
        body: JSON.stringify({ role, permissions }),
      }),
    onSuccess: () => {
      toast.success('Звʼязок користувача з організацією оновлено');
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.userDetails(userId) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useAdminRemoveUserOrganizationLink(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) =>
      apiFetch(`/api/admin/users/${userId}/organizations/${organizationId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Звʼязок користувача з організацією видалено');
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.userDetails(userId) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => toast.error(error.message),
  });
}
