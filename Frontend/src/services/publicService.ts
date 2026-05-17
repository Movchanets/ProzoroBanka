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
  PublicCampaignCategory,
  CampaignFeedItem,
} from '../types';

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
    return apiFetch<PublicListResponse<PublicOrganization>>(`/api/public/organizations?${params.toString()}`);
  },

  getOrganization: (slug: string) =>
    apiFetch<PublicOrganization>(`/api/public/organizations/${slug}`),

  getOrganizationCampaigns: (slug: string, status?: CampaignStatus, page = 1, pageSize = 12) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (status !== undefined) params.set('status', String(status));
    return apiFetch<PublicListResponse<PublicCampaign>>(`/api/public/organizations/${slug}/campaigns?${params.toString()}`);
  },

  searchCampaigns: (
    query: string,
    categorySlug?: string,
    status?: CampaignStatus,
    verifiedOnly = false,
    page = 1,
    pageSize = 24,
  ) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('query', query.trim());
    if (categorySlug) params.set('categorySlug', categorySlug);
    if (status !== undefined) params.set('status', String(status));
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (verifiedOnly) params.set('verifiedOnly', 'true');
    return apiFetch<PublicListResponse<PublicCampaign>>(`/api/public/campaigns/search?${params.toString()}`);
  },

  getCampaignCategories: () =>
    apiFetch<PublicCampaignCategory[]>('/api/public/campaign-categories'),

  getCampaign: (campaignId: string) =>
    apiFetch<PublicCampaignDetail>(`/api/public/campaigns/${campaignId}`)
      .then((campaign) => ({
        ...campaign,
        posts: (campaign.posts ?? []).map((post) => ({
          ...post,
          images: (post.images ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder),
        })),
      })),

  getCampaignPosts: (campaignId: string) =>
    apiFetch<PublicCampaignDetail['posts']>(`/api/public/campaigns/${campaignId}/posts`),

  getCampaignFeed: (campaignId: string, page = 1, pageSize = 20) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return apiFetch<PublicListResponse<CampaignFeedItem>>(`/api/public/campaigns/${campaignId}/feed?${params.toString()}`);
  },

  getPublicFeed: (page = 1, pageSize = 20) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return apiFetch<PublicListResponse<CampaignFeedItem>>(`/api/public/feed?${params.toString()}`);
  },

  getCampaignReceipts: (campaignId: string, page = 1, pageSize = 20) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return apiFetch<PublicListResponse<PublicReceipt>>(`/api/public/campaigns/${campaignId}/receipts?${params.toString()}`);
  },

  getReceipt: (receiptId: string) =>
    apiFetch<PublicReceiptDetail>(`/api/public/receipts/${receiptId}`),

  getOrganizationTransparency: (slug: string) =>
    apiFetch<Transparency>(`/api/public/organizations/${slug}/transparency`),
};
