import type { CampaignStatus } from './domains/campaigns';
import type { OrganizationPermissions, OrganizationRole } from './domains/organizations';

export const OrganizationPlanType = {
  Free: 1,
  Paid: 2,
} as const;

export type OrganizationPlanType = typeof OrganizationPlanType[keyof typeof OrganizationPlanType];

export interface AdminOrganizationDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  isVerified: boolean;
  website?: string;
  contactEmail?: string;
  phone?: string;
  ownerUserId: string;
  ownerName: string;
  ownerEmail: string;
  memberCount: number;
  campaignCount: number;
  totalRaised: number;
  createdAt: string;
  planType: OrganizationPlanType;
}

export interface AdminOrganizationListResponse {
  items: AdminOrganizationDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AdminCampaignDto {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  goalAmount: number;
  currentAmount: number;
  status: CampaignStatus;
  startDate?: string;
  deadline?: string;
  organizationName: string;
  createdByName: string;
  createdAt: string;
}

export interface AdminRoleDto {
  name: string;
  description: string;
  permissions: string[];
}

export interface AdminUserDto {
  id: string; // Identity user ID
  domainUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string;
  isActive: boolean;
  createdAt: string;
  roles: string[];
}

export interface AdminUserOrganizationLinkDto {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  isVerified: boolean;
  planType: OrganizationPlanType;
  role: OrganizationRole;
  permissions: OrganizationPermissions;
  joinedAt: string;
  isOwner: boolean;
}

export interface AdminUserDetailsDto {
  id: string;
  domainUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profilePhotoUrl?: string;
  isActive: boolean;
  createdAt: string;
  roles: string[];
  organizations: AdminUserOrganizationLinkDto[];
}

export interface AdminUserListResponse {
  items: AdminUserDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AdminUsersFilters {
  search?: string;
  isActive?: boolean;
  role?: string;
}

export interface AdminUserLimitsSettingsDto {
  maxOwnedOrganizationsForNonAdmin: number;
}

export interface AdminPlanLimitsDto {
  maxCampaigns: number;
  maxMembers: number;
  maxOcrExtractionsPerMonth: number;
}

export interface AdminPlansSettingsDto {
  free: AdminPlanLimitsDto;
  paid: AdminPlanLimitsDto;
}

export interface AdminGeneralSettingsDto {
  maxOwnedOrganizationsForNonAdmin: number;
  maxJoinedOrganizationsForNonAdmin: number;
}

export interface OrganizationPlanUsageDto {
  planType: OrganizationPlanType;
  maxCampaigns: number;
  currentCampaigns: number;
  maxMembers: number;
  currentMembers: number;
  maxOcrExtractionsPerMonth: number;
  currentOcrExtractionsPerMonth: number;
}
