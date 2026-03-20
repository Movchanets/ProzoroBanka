import { apiFetch } from './api';
import type { Invitation, InviteByEmailPayload, OrganizationRole } from '../types';

export const invitationService = {
  /** Get pending invitations for the current user */
  getMyInvitations: () =>
    apiFetch<Invitation[]>('/api/invitations/my'),

  /** Get invitations sent by orgs where current user is admin/owner */
  getOrganizationInvitations: (orgId: string) =>
    apiFetch<Invitation[]>(`/api/organizations/${orgId}/invites`),

  /** Get public info about an invite token (no auth required) */
  getInvitationByToken: (token: string) =>
    apiFetch<Invitation>(`/api/invitations/${token}`),

  /** Create shareable invite link */
  createInviteLink: (orgId: string, payload: { role: OrganizationRole; expiresInHours?: number }) =>
    apiFetch<Invitation>(`/api/organizations/${orgId}/invites/link`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Invite member by email */
  inviteByEmail: (orgId: string, payload: InviteByEmailPayload) =>
    apiFetch<Invitation>(`/api/organizations/${orgId}/invites/email`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Accept an invitation */
  accept: (token: string) =>
    apiFetch<void>(`/api/invitations/${token}/accept`, { method: 'POST' }),

  /** Decline an invitation */
  decline: (token: string) =>
    apiFetch<void>(`/api/invitations/${token}/decline`, { method: 'POST' }),

  /** Cancel/revoke a sent invitation (admin action) */
  cancel: (orgId: string, invitationId: string) =>
    apiFetch<void>(`/api/organizations/${orgId}/invites/${invitationId}`, { method: 'DELETE' }),
};
