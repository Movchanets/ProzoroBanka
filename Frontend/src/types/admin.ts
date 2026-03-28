import { CampaignStatus } from './index';

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

export interface AdminUserListResponse {
  items: AdminUserDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}
