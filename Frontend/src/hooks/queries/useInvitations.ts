import { useMutation, useQuery } from '@tanstack/react-query';
import { invitationService } from '../../services/invitationService';
import { queryClient } from '../../services/queryClient';
import { orgKeys } from './useOrganizations';

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
    queryFn: () => invitationService.getSentInvitations(orgId!),
    enabled: !!orgId,
  });
}

export function useInviteInfo(token: string | null | undefined) {
  return useQuery({
    queryKey: invitationKeys.info(token!),
    queryFn: () => invitationService.getInviteInfo(token!),
    enabled: !!token,
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
    mutationFn: (invitationId: string) => invitationService.cancel(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.sent(orgId) });
    },
  });
}
