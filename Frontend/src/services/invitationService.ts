import { apiFetch } from './api';
import type { Invitation, InviteLinkInfo } from '../types';

export const invitationService = {
  /** Get pending invitations for the current user */
  getMyInvitations: () =>
    apiFetch<Invitation[]>('/api/invitations/my'),

  /** Get invitations sent by orgs where current user is admin/owner */
  getSentInvitations: (orgId: string) =>
    apiFetch<Invitation[]>(`/api/organizations/${orgId}/invitations`),

  /** Get public info about an invite token (no auth required) */
  getInviteInfo: (token: string) =>
    apiFetch<InviteLinkInfo>(`/api/invitations/${token}`),

  /** Accept an invitation */
  accept: (token: string) =>
    apiFetch<void>(`/api/invitations/${token}/accept`, { method: 'POST' }),

  /** Decline an invitation */
  decline: (token: string) =>
    apiFetch<void>(`/api/invitations/${token}/decline`, { method: 'POST' }),

  /** Cancel/revoke a sent invitation (admin action) */
  cancel: (invitationId: string) =>
    apiFetch<void>(`/api/invitations/${invitationId}/cancel`, { method: 'POST' }),
};
