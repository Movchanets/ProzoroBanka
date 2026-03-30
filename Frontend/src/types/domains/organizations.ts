export const OrganizationRole = {
  Owner: 0,
  Admin: 1,
  Reporter: 2,
} as const;

export type OrganizationRole = typeof OrganizationRole[keyof typeof OrganizationRole];

export const OrganizationRoleLabel: Record<OrganizationRole, string> = {
  [OrganizationRole.Owner]: 'roles.owner',
  [OrganizationRole.Admin]: 'roles.admin',
  [OrganizationRole.Reporter]: 'roles.reporter',
} as const;

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  isVerified: boolean;
  memberCount: number;
  createdAt: string;
}

export interface OrganizationDetail extends Organization {
  website?: string;
  contactEmail?: string;
  phone?: string;
  socialLinks?: string;
  members: OrganizationMember[];
}

export interface OrganizationMember {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: OrganizationRole;
  permissions: number;
  joinedAt: string;
  avatarUrl?: string;
}

export interface CreateOrganizationPayload {
  name: string;
  slug?: string;
  description?: string;
  website?: string;
}

export interface UpdateOrganizationPayload {
  name?: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  phone?: string;
}

export interface UpdateMemberRolePayload {
  role: OrganizationRole;
  permissions?: number;
}
