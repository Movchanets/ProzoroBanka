export const OrganizationRole = {
  Owner: 0,
  Admin: 1,
  Reporter: 2,
} as const;

export type OrganizationRole = typeof OrganizationRole[keyof typeof OrganizationRole];

export const OrganizationPermissions = {
  None: 0,
  ManageOrganization: 1 << 0,
  ManageMembers: 1 << 1,
  ManageInvitations: 1 << 2,
  ManageReceipts: 1 << 3,
  ViewReports: 1 << 4,
  UploadLogo: 1 << 5,
  ManageCampaigns: 1 << 6,
  All:
    (1 << 0) |
    (1 << 1) |
    (1 << 2) |
    (1 << 3) |
    (1 << 4) |
    (1 << 5) |
    (1 << 6),
} as const;

export type OrganizationPermissions = typeof OrganizationPermissions[keyof typeof OrganizationPermissions];

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
  planType: 1 | 2;
  isBlocked?: boolean;
  blockReason?: string;
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

export const StateRegistryProvider = {
  TaxService: 'TaxService',
  CheckGovUa: 'CheckGovUa',
} as const;

export type StateRegistryProvider = typeof StateRegistryProvider[keyof typeof StateRegistryProvider];

export interface StateRegistryCredentialSummary {
  provider: StateRegistryProvider;
  isConfigured: boolean;
  maskedKey?: string | null;
  lastValidatedAtUtc?: string | null;
  lastUsedAtUtc?: string | null;
}

export interface OrganizationStateRegistrySettings {
  taxService: StateRegistryCredentialSummary;
  checkGovUa: StateRegistryCredentialSummary;
  stateVerificationConfiguredKeys: number;
  stateVerificationMaxKeys: number;
  currentOcrExtractionsPerMonth: number;
  maxOcrExtractionsPerMonth: number;
}
