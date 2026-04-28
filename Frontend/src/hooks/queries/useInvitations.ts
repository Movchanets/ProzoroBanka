import { useMutation, useQuery } from '@tanstack/react-query';
import { invitationService } from '../../services/invitationService';
import { queryClient } from '../../services/queryClient';
import { orgKeys } from './useOrganizations';
import type { InviteByEmailPayload, OrganizationRole } from '../../types';

export const invitationKeys = {
  my: ['invitations', 'my'] as const,
  sent: (orgId: string) => ['invitations', 'sent', orgId] as const,
  info: (token: string) => ['invitations', 'info', token] as const,
};

export function useMyInvitations() {
  return useQuery({
    queryKey: invitationKeys.my,
    queryFn: invitationService.getMyInvitations,
  });
}

export function useSentInvitations(orgId: string | null | undefined) {
  return useQuery({
    queryKey: invitationKeys.sent(orgId!),
    queryFn: () => invitationService.getOrganizationInvitations(orgId!),
    enabled: !!orgId,
  });
}

export function useOrgInvitations(orgId: string | null | undefined) {
  return useSentInvitations(orgId);
}

export function useInviteInfo(token: string | null | undefined) {
  return useQuery({
    queryKey: invitationKeys.info(token!),
    queryFn: () => invitationService.getInvitationByToken(token!),
    enabled: !!token,
  });
}

export function useInvitationByToken(token: string | null | undefined) {
  return useInviteInfo(token);
}

export function useCreateInviteLink(orgId: string) {
  return useMutation({
    mutationFn: (payload: { role: OrganizationRole; expiresInHours?: number }) => invitationService.createInviteLink(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.sent(orgId) });
    },
  });
}

export function useInviteByEmail(orgId: string) {
  return useMutation({
    mutationFn: (payload: InviteByEmailPayload) => invitationService.inviteByEmail(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.sent(orgId) });
    },
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (token: string) => invitationService.accept(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.my });
      queryClient.invalidateQueries({ queryKey: orgKeys.my() });
    },
  });
}

export function useDeclineInvitation() {
  return useMutation({
    mutationFn: (token: string) => invitationService.decline(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.my });
    },
  });
}

export function useCancelInvitation(orgId: string) {
  return useMutation({
    mutationFn: (invitationId: string) => invitationService.cancel(orgId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.sent(orgId) });
    },
  });
}

export const getInviteInfoOptions = (token: string) => ({
  queryKey: invitationKeys.info(token),
  queryFn: () => invitationService.getInvitationByToken(token),
});

export const getMyInvitationsOptions = () => ({
  queryKey: invitationKeys.my,
  queryFn: invitationService.getMyInvitations,
});
