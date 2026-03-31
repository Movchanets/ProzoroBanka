import type { CampaignStatus } from './campaigns';

export interface PublicListResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface PublicTeamMember {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  isVerified: boolean;
  website?: string;
  memberCount: number;
  activeCampaignCount: number;
  totalRaised: number;
  teamMembers: PublicTeamMember[];
}

export interface PublicCampaign {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  sendUrl?: string;
  goalAmount: number;
  currentAmount: number;
  status: CampaignStatus;
  startDate?: string;
  deadline?: string;
  receiptCount: number;
  organizationName: string;
  organizationSlug: string;
  organizationVerified: boolean;
}

export interface PublicReceipt {
  id: string;
  merchantName?: string;
  totalAmount?: number;
  transactionDate?: string;
  addedByName?: string;
}

export interface PublicCampaignDetail {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  sendUrl?: string;
  goalAmount: number;
  currentAmount: number;
  status: CampaignStatus;
  startDate?: string;
  deadline?: string;
  progressPercentage: number;
  daysRemaining?: number;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  latestReceipts: PublicReceipt[];
}

export interface TransparencyCategory {
  name: string;
  amount: number;
  percentage: number;
}

export interface TransparencyMonthly {
  month: string;
  amount: number;
}

export interface Transparency {
  totalSpent: number;
  categories: TransparencyCategory[];
  monthlySpendings: TransparencyMonthly[];
  receiptCount: number;
  verifiedReceiptCount: number;
}
