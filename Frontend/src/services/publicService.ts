import { apiFetch } from './api';
import type {
  CampaignStatus,
  PublicCampaign,
  PublicCampaignDetail,
  PublicListResponse,
  PublicOrganization,
  PublicReceipt,
  PublicReceiptDetail,
  Transparency,
} from '../types';

const MINOR_UNITS_PER_HRYVNIA = 100;

function toHryvnia(amount: number): number {
  return amount / MINOR_UNITS_PER_HRYVNIA;
}

function mapPublicCampaignAmount(campaign: PublicCampaign): PublicCampaign {
  return {
    ...campaign,
    goalAmount: toHryvnia(campaign.goalAmount),
    currentAmount: toHryvnia(campaign.currentAmount),
    documentedAmount: toHryvnia(campaign.documentedAmount),
  };
}

function mapPublicReceiptAmount(receipt: PublicReceipt): PublicReceipt {
  return {
    ...receipt,
    totalAmount: receipt.totalAmount === undefined ? undefined : toHryvnia(receipt.totalAmount),
  };
}

function mapPublicReceiptDetailAmount(receipt: PublicReceiptDetail): PublicReceiptDetail {
  return {
    ...receipt,
    totalAmount: receipt.totalAmount === undefined ? undefined : toHryvnia(receipt.totalAmount),
    items: (receipt.items ?? []).map((item) => ({
      ...item,
      unitPrice: item.unitPrice === undefined ? undefined : toHryvnia(item.unitPrice),
      totalPrice: item.totalPrice === undefined ? undefined : toHryvnia(item.totalPrice),
      vatAmount: item.vatAmount === undefined ? undefined : toHryvnia(item.vatAmount),
    })),
    itemPhotos: receipt.itemPhotos ?? [],
  };
}

function mapTransparencyAmounts(transparency: Transparency): Transparency {
  return {
    ...transparency,
    totalSpent: toHryvnia(transparency.totalSpent),
    categories: transparency.categories.map((category) => ({
      ...category,
      amount: toHryvnia(category.amount),
    })),
    monthlySpendings: transparency.monthlySpendings.map((monthly) => ({
      ...monthly,
      amount: toHryvnia(monthly.amount),
    })),
  };
}

export const publicService = {
  searchOrganizations: (
    query: string,
    page: number,
    verifiedOnly: boolean,
    activeOnly: boolean,
    sortBy?: 'verified' | 'totalRaised' | 'activeCampaigns',
    pageSize = 12,
  ) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('query', query.trim());
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (verifiedOnly) params.set('verifiedOnly', 'true');
    if (activeOnly) params.set('activeOnly', 'true');
    if (sortBy) params.set('sortBy', sortBy);
    return apiFetch<PublicListResponse<PublicOrganization>>(`/api/public/organizations?${params.toString()}`)
      .then((response) => ({
        ...response,
        items: response.items.map((organization) => ({
          ...organization,
          totalRaised: toHryvnia(organization.totalRaised),
        })),
      }));
  },

  getOrganization: (slug: string) =>
    apiFetch<PublicOrganization>(`/api/public/organizations/${slug}`)
      .then((organization) => ({
        ...organization,
        totalRaised: toHryvnia(organization.totalRaised),
      })),

  getOrganizationCampaigns: (slug: string, status?: CampaignStatus, page = 1, pageSize = 12) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (status !== undefined) params.set('status', String(status));
    return apiFetch<PublicListResponse<PublicCampaign>>(`/api/public/organizations/${slug}/campaigns?${params.toString()}`)
      .then((response) => ({
        ...response,
        items: response.items.map(mapPublicCampaignAmount),
      }));
  },

  searchCampaigns: (
    query: string,
    status?: CampaignStatus,
    verifiedOnly = false,
    page = 1,
    pageSize = 24,
  ) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('query', query.trim());
    if (status !== undefined) params.set('status', String(status));
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (verifiedOnly) params.set('verifiedOnly', 'true');
    return apiFetch<PublicListResponse<PublicCampaign>>(`/api/public/campaigns/search?${params.toString()}`)
      .then((response) => ({
        ...response,
        items: response.items.map(mapPublicCampaignAmount),
      }));
  },

  getCampaign: (campaignId: string) =>
    apiFetch<PublicCampaignDetail>(`/api/public/campaigns/${campaignId}`)
      .then((campaign) => ({
        ...campaign,
        goalAmount: toHryvnia(campaign.goalAmount),
        currentAmount: toHryvnia(campaign.currentAmount),
        documentedAmount: toHryvnia(campaign.documentedAmount),
        latestReceipts: campaign.latestReceipts.map(mapPublicReceiptAmount),
        posts: campaign.posts ?? [],
      })),

  getCampaignReceipts: (campaignId: string, page = 1, pageSize = 20) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return apiFetch<PublicListResponse<PublicReceipt>>(`/api/public/campaigns/${campaignId}/receipts?${params.toString()}`)
      .then((response) => ({
        ...response,
        items: response.items.map(mapPublicReceiptAmount),
      }));
  },

  getReceipt: (receiptId: string) =>
    apiFetch<PublicReceiptDetail>(`/api/public/receipts/${receiptId}`)
      .then(mapPublicReceiptDetailAmount),

  getOrganizationTransparency: (slug: string) =>
    apiFetch<Transparency>(`/api/public/organizations/${slug}/transparency`)
      .then(mapTransparencyAmounts),
};
