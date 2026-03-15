import { useMutation, useQuery } from '@tanstack/react-query';
import { organizationService } from '../../services/organizationService';
import { queryClient } from '../../services/queryClient';
import type {
  CreateOrganizationPayload,
  UpdateMemberRolePayload,
  UpdateOrganizationPayload,
} from '../../types';

export const orgKeys = {
  all: ['organizations'] as const,
  my: () => [...orgKeys.all, 'my'] as const,
  detail: (id: string) => [...orgKeys.all, 'detail', id] as const,
  members: (id: string) => [...orgKeys.all, 'members', id] as const,
};

export function useMyOrganizations() {
  return useQuery({
    queryKey: orgKeys.my(),
    queryFn: organizationService.getMyOrganizations,
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
