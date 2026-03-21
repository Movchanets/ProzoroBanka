import { apiFetch } from './api';
import type {
  Campaign,
  CampaignDetail,
  CampaignStats,
  CampaignStatus,
  ChangeCampaignStatusPayload,
  CreateCampaignPayload,
  UpdateCampaignPayload,
} from '../types';

export const campaignService = {
  listByOrganization: (orgId: string, status?: CampaignStatus) => {
    const query = status !== undefined ? `?status=${status}` : '';
    return apiFetch<Campaign[]>(`/api/organizations/${orgId}/campaigns${query}`);
  },

  getStats: (orgId: string) =>
    apiFetch<CampaignStats>(`/api/organizations/${orgId}/campaigns/stats`),

  getDetails: (id: string) =>
    apiFetch<CampaignDetail>(`/api/campaigns/${id}`),

  create: (orgId: string, payload: CreateCampaignPayload) =>
    apiFetch<Campaign>(`/api/organizations/${orgId}/campaigns`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateCampaignPayload) =>
    apiFetch<Campaign>(`/api/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  changeStatus: (id: string, payload: ChangeCampaignStatusPayload) =>
    apiFetch<{ message: string }>(`/api/campaigns/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  uploadCover: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<Campaign>(`/api/campaigns/${id}/cover`, {
      method: 'POST',
      body: formData,
    });
  },

  delete: (id: string) =>
    apiFetch<void>(`/api/campaigns/${id}`, {
      method: 'DELETE',
    }),
};
