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
  titleUk: string;
  titleEn: string;
  description?: string;
  coverImageUrl?: string;
  sendUrl?: string;
  goalAmount: number;
  currentAmount: number;
  documentedAmount: number;
  documentationPercent: number;
  status: CampaignStatus;
  startDate?: string;
  deadline?: string;
  categories: PublicCampaignCategory[];
  receiptCount: number;
  organizationName: string;
  organizationSlug: string;
  organizationVerified: boolean;
}

export interface PublicCampaignCategory {
  id: string;
  nameUk: string;
  nameEn: string;
  slug: string;
}

export interface PublicReceipt {
  id: string;
  merchantName?: string;
  totalAmount?: number;
  transactionDate?: string;
  addedByName?: string;
}

export interface PublicReceiptDetail {
  id: string;
  merchantName?: string;
  totalAmount?: number;
  transactionDate?: string;
  status: string;
  imageUrl: string;
  structuredOutputJson?: string;
  items: PublicReceiptItem[];
  itemPhotos: PublicReceiptItemPhoto[];
  addedByName?: string;
  campaignId?: string;
  campaignTitle?: string;
  organizationName?: string;
  organizationSlug?: string;
  verificationUrl?: string;
  isConfirmed: boolean;
}

export interface PublicReceiptItem {
  id: string;
  name: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  barcode?: string;
  vatRate?: number;
  vatAmount?: number;
  sortOrder: number;
}

export interface PublicReceiptItemPhoto {
  id: string;
  receiptItemId?: string;
  originalFileName: string;
  photoUrl: string;
  sortOrder: number;
}

export interface PublicCampaignDetail {
  id: string;
  titleUk: string;
  titleEn: string;
  description?: string;
  coverImageUrl?: string;
  sendUrl?: string;
  goalAmount: number;
  currentAmount: number;
  documentedAmount: number;
  documentationPercent: number;
  status: CampaignStatus;
  startDate?: string;
  deadline?: string;
  progressPercentage: number;
  daysRemaining?: number;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  categories: PublicCampaignCategory[];
  latestReceipts: PublicReceipt[];
  posts: PublicCampaignPost[];
}

export interface PublicCampaignPost {
  id: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
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
