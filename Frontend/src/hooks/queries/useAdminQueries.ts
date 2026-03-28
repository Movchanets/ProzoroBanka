import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../services/api';
import type { ServiceResponse, CampaignStatus } from '../../types';
import type { AdminOrganizationListResponse, AdminCampaignDto, AdminUserListResponse, AdminRoleDto } from '../../types/admin';
import { toast } from 'sonner';

export const adminQueryKeys = {
  organizations: (page: number, verifiedOnly?: boolean) => ['admin', 'organizations', page, verifiedOnly] as const,
  organizationCampaigns: (orgId: string, page: number) => ['admin', 'organizations', orgId, 'campaigns', page] as const,
  users: (page: number) => ['admin', 'users', page] as const,
  roles: () => ['admin', 'roles'] as const,
};

export function useAdminOrganizations(page: number, verifiedOnly?: boolean) {
  return useQuery({
    queryKey: adminQueryKeys.organizations(page, verifiedOnly),
    queryFn: () => {
      const url = new URL('/api/admin/organizations', window.location.origin);
      url.searchParams.set('page', page.toString());
      if (verifiedOnly !== undefined && verifiedOnly !== null) {
        url.searchParams.set('verifiedOnly', String(verifiedOnly));
      }
      return apiFetch<AdminOrganizationListResponse>(url.pathname + url.search);
    },
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

export function useAdminOrganizationCampaigns(orgId: string, page: number) {
  return useQuery({
    queryKey: adminQueryKeys.organizationCampaigns(orgId, page),
    queryFn: () =>
      apiFetch<AdminCampaignDto[]>(`/api/admin/organizations/${orgId}/campaigns?page=${page}`),
    enabled: !!orgId,
  });
}

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

export function useAdminUsers(page: number) {
  return useQuery({
    queryKey: adminQueryKeys.users(page),
    queryFn: () => apiFetch<AdminUserListResponse>(`/api/admin/users?page=${page}`),
  });
}

export function useAdminRoles() {
  return useQuery({
    queryKey: adminQueryKeys.roles(),
    queryFn: () => apiFetch<AdminRoleDto[]>('/api/admin/roles'),
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
