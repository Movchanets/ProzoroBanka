import { apiFetch } from './api';
import type {
  CampaignStatus,
  PublicCampaign,
  PublicCampaignDetail,
  PublicListResponse,
  PublicOrganization,
  PublicReceipt,
  Transparency,
} from '../types';

export const publicService = {
  searchOrganizations: (
    query: string,
    page: number,
    verifiedOnly: boolean,
    activeOnly: boolean,
    pageSize = 12,
  ) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('query', query.trim());
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (verifiedOnly) params.set('verifiedOnly', 'true');
    if (activeOnly) params.set('activeOnly', 'true');
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

  getCampaign: (campaignId: string) =>
    apiFetch<PublicCampaignDetail>(`/api/public/campaigns/${campaignId}`),

  getCampaignReceipts: (campaignId: string, page = 1, pageSize = 20) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return apiFetch<PublicListResponse<PublicReceipt>>(`/api/public/campaigns/${campaignId}/receipts?${params.toString()}`);
  },

  getOrganizationTransparency: (slug: string) =>
    apiFetch<Transparency>(`/api/public/organizations/${slug}/transparency`),
};
