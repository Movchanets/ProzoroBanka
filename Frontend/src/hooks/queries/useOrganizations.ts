import { useMutation, useQuery } from '@tanstack/react-query';
import { organizationService } from '../../services/organizationService';
import { queryClient } from '../../services/queryClient';
import type {
  CreateOrganizationPayload,
  StateRegistryProvider,
  UpdateMemberRolePayload,
  UpdateOrganizationPayload,
} from '../../types';

export const orgKeys = {
  all: ['organizations'] as const,
  my: () => [...orgKeys.all, 'my'] as const,
  detail: (id: string) => [...orgKeys.all, 'detail', id] as const,
  members: (id: string) => [...orgKeys.all, 'members', id] as const,
  stateRegistrySettings: (id: string) => [...orgKeys.all, 'state-registry-settings', id] as const,
};

export function useMyOrganizations(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: orgKeys.my(),
    queryFn: () => organizationService.getMyOrganizations(),
    enabled: options?.enabled,
  });
}

export function useOrganization(id: string | null | undefined) {
  return useQuery({
    queryKey: orgKeys.detail(id!),
    queryFn: () => organizationService.getOrganization(id!),
    enabled: !!id,
  });
}

export function useOrganizationMembers(id: string | null | undefined) {
  return useQuery({
    queryKey: orgKeys.members(id!),
    queryFn: () => organizationService.getMembers(id!),
    enabled: !!id,
  });
}

export function useCreateOrganization() {
  return useMutation({
    mutationFn: (payload: CreateOrganizationPayload) =>
      organizationService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.my() });
    },
  });
}

export function useUpdateOrganization(orgId: string) {
  return useMutation({
    mutationFn: (payload: UpdateOrganizationPayload) =>
      organizationService.update(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.detail(orgId) });
      queryClient.invalidateQueries({ queryKey: orgKeys.my() });
    },
  });
}

export function useUploadOrgLogo(orgId: string) {
  return useMutation({
    mutationFn: (file: File) => organizationService.uploadLogo(orgId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.detail(orgId) });
      queryClient.invalidateQueries({ queryKey: orgKeys.my() });
    },
  });
}

export function useUpdateMemberRole(orgId: string) {
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateMemberRolePayload }) =>
      organizationService.updateMember(orgId, userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) });
    },
  });
}

export function useRemoveMember(orgId: string) {
  return useMutation({
    mutationFn: (userId: string) => organizationService.removeMember(orgId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) });
    },
  });
}

export function useLeaveOrganization() {
  return useMutation({
    mutationFn: (orgId: string) => organizationService.leave(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.my() });
    },
  });
}

export function useOrganizationStateRegistrySettings(id: string | null | undefined) {
  return useQuery({
    queryKey: orgKeys.stateRegistrySettings(id!),
    queryFn: () => organizationService.getStateRegistrySettings(id!),
    enabled: !!id,
  });
}

export function useUpsertStateRegistryCredential(orgId: string) {
  return useMutation({
    mutationFn: ({ provider, apiKey }: { provider: StateRegistryProvider; apiKey: string }) =>
      organizationService.upsertStateRegistryCredential(orgId, provider, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.stateRegistrySettings(orgId) });
    },
  });
}

export function useDeleteStateRegistryCredential(orgId: string) {
  return useMutation({
    mutationFn: (provider: StateRegistryProvider) =>
      organizationService.deleteStateRegistryCredential(orgId, provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.stateRegistrySettings(orgId) });
    },
  });
}

export const getMyOrganizationsOptions = () => ({
  queryKey: orgKeys.my(),
  queryFn: () => organizationService.getMyOrganizations(),
});

export const getOrganizationOptions = (id: string) => ({
  queryKey: orgKeys.detail(id),
  queryFn: () => organizationService.getOrganization(id),
});

export const getOrganizationMembersOptions = (id: string) => ({
  queryKey: orgKeys.members(id),
  queryFn: () => organizationService.getMembers(id),
});

export const getOrganizationStateRegistrySettingsOptions = (id: string) => ({
  queryKey: orgKeys.stateRegistrySettings(id),
  queryFn: () => organizationService.getStateRegistrySettings(id),
});
