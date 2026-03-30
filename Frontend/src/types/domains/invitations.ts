import type { OrganizationRole } from './organizations';

export const InvitationStatus = {
  Pending: 0,
  Accepted: 1,
  Declined: 2,
  Expired: 3,
  Cancelled: 4,
} as const;

export type InvitationStatus = typeof InvitationStatus[keyof typeof InvitationStatus];

export interface Invitation {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationLogoUrl?: string;
  email?: string;
  role: OrganizationRole;
  status: InvitationStatus;
  token?: string;
  inviterFirstName: string;
  inviterLastName: string;
  invitedByName?: string;
  createdAt: string;
  expiresAt: string;
}

export interface InviteByEmailPayload {
  email: string;
  role: OrganizationRole;
}

export interface InviteLinkInfo {
  id?: string;
  organizationId?: string;
  organizationName: string;
  organizationLogoUrl?: string;
  email?: string;
  role: OrganizationRole;
  status?: InvitationStatus;
  token?: string;
  inviterFirstName?: string;
  inviterLastName?: string;
  invitedByName: string;
  createdAt?: string;
  expiresAt: string;
}
