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
  titleUk: string;
  titleEn: string;
  description?: string;
  coverImageUrl?: string;
  sendUrl?: string;
  goalAmount: number;
  currentAmount: number;
  withdrawnAmount: number;
  documentedAmount: number;
  documentationPercent: number;
  status: CampaignStatus;
  startDate?: string;
  deadline?: string;
  monobankAccountId?: string;
  categories: CampaignCategory[];
  receiptCount?: number;
  createdAt: string;
}

export interface CampaignCategory {
  id: string;
  nameUk: string;
  nameEn: string;
  slug: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CampaignDetail extends Campaign {
  organizationId: string;
  organizationName: string;
  createdByName: string;
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRaised: number;
  totalDocumented: number;
  documentationPercent: number;
}

export interface CreateCampaignPayload {
  titleUk: string;
  titleEn: string;
  description?: string;
  goalAmount: number;
  deadline?: string;
  categoryIds?: string[];
  sendUrl?: string;
}

export interface UpdateCampaignPayload {
  titleUk?: string;
  titleEn?: string;
  description?: string;
  goalAmount?: number;
  deadline?: string;
  categoryIds?: string[];
  sendUrl?: string;
}

export interface ChangeCampaignStatusPayload {
  newStatus: CampaignStatus;
}

export interface UpdateCampaignBalancePayload {
  newCurrentAmount: number;
  reason?: string;
}

export interface MonobankJar {
  id: string;
  sendId?: string | null;
  title: string;
  description?: string | null;
  currencyCode: number;
  balance: number;
  goal?: number | null;
}

export interface MonobankAccount {
  id: string;
  sendId?: string | null;
  balance: number;
  creditLimit: number;
  type: string;
  currencyCode: number;
  cashbackType?: string | null;
  iban?: string | null;
}

export interface MonobankClientInfo {
  clientId?: string | null;
  name?: string | null;
  webHookUrl?: string | null;
  accounts: MonobankAccount[];
  jars: MonobankJar[];
}

export interface SetupMonobankWebhookPayload {
  campaignId: string;
  token: string;
  selectedJarAccountId: string;
  webhookUrl: string;
}

export interface CampaignTransaction {
  id: string;
  amount: number;
  description?: string | null;
  transactionTimeUtc: string;
  source: string;
  createdAt: string;
}

export interface CampaignPhoto {
  id: string;
  photoUrl: string;
  originalFileName: string;
  description?: string | null;
  isCover: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface CampaignPostImage {
  id: string;
  imageUrl: string;
  originalFileName: string;
  sortOrder: number;
}

export interface CampaignPost {
  id: string;
  postContentJson?: string;
  images: CampaignPostImage[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCampaignPostPayload {
  postContentJson?: string;
  images: File[];
}

export interface UpdateCampaignPostPayload {
  postContentJson?: string;
  removeImageIds?: string[];
  imageOrderIds?: string[];
}

export interface ReorderCampaignPhotosPayload {
  photoIds: string[];
}

export interface UpdateCampaignPhotoPayload {
  description?: string;
  setAsCover?: boolean;
}
