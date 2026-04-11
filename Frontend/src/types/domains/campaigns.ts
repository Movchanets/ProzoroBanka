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
  title: string;
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
  receiptCount?: number;
  createdAt: string;
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
  title: string;
  description?: string;
  goalAmount: number;
  deadline?: string;
  sendUrl?: string;
}

export interface UpdateCampaignPayload {
  title?: string;
  description?: string;
  goalAmount?: number;
  deadline?: string;
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
  sortOrder: number;
  createdAt: string;
}

export interface ReorderCampaignPhotosPayload {
  photoIds: string[];
}

export interface UpdateCampaignPhotoPayload {
  description?: string;
}
