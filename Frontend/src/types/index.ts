export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  profilePhotoUrl?: string;
  roles?: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  user: User;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

export interface ApiError {
  message?: string;
  error?: string;
  type?: string;
  title?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export interface ProfileUpdatePayload {
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
}

export interface Receipt {
  id: string;
  storageKey: string;
  originalFileName?: string;
  merchantName?: string;
  totalAmount?: number;
  transactionDate?: string;
  status: ReceiptStatus;
  parsedBy?: OcrProvider;
  matchedTransactionId?: string;
  createdAt: string;
}

export const ReceiptStatus = {
  Uploaded: 0,
  Parsing: 1,
  Parsed: 2,
  ParseFailed: 3,
  Matched: 4,
  Draft: 5,
  Verified: 6,
} as const;
export type ReceiptStatus = typeof ReceiptStatus[keyof typeof ReceiptStatus];

export const OcrProvider = {
  AzureDocumentIntelligence: 0,
  MistralOcr: 1,
  Manual: 2,
} as const;
export type OcrProvider = typeof OcrProvider[keyof typeof OcrProvider];

export interface MonobankTransaction {
  id: string;
  amount: number;
  time: string;
  description: string;
  merchantName?: string;
  mcc: number;
}

// ── Organizations ──

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

// ── Invitations ──

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

// ── Campaigns ──

export const CampaignStatus = {
  Draft: 0,
  Active: 1,
  Paused: 2,
  Completed: 3,
} as const;
export type CampaignStatus = typeof CampaignStatus[keyof typeof CampaignStatus];

export const CampaignStatusLabel: Record<CampaignStatus, string> = {
  [CampaignStatus.Draft]: 'campaignStatus.draft',
  [CampaignStatus.Active]: 'campaignStatus.active',
  [CampaignStatus.Paused]: 'campaignStatus.paused',
  [CampaignStatus.Completed]: 'campaignStatus.completed',
} as const;

export interface Campaign {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  goalAmount: number;
  currentAmount: number;
  status: CampaignStatus;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignPayload {
  title: string;
  description?: string;
  goalAmount: number;
  deadline?: string;
}

export interface UpdateCampaignPayload {
  title?: string;
  description?: string;
  goalAmount?: number;
  status?: CampaignStatus;
  deadline?: string;
}

// ── ServiceResponse wrapper ──

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
