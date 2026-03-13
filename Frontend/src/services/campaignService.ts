import { apiFetch } from './api';
import type {
  Campaign,
  CreateCampaignPayload,
  UpdateCampaignPayload,
} from '../types';

export const campaignService = {
  list: (orgId: string) =>
    apiFetch<Campaign[]>(`/api/organizations/${orgId}/campaigns`),

  get: (orgId: string, id: string) =>
    apiFetch<Campaign>(`/api/organizations/${orgId}/campaigns/${id}`),

  create: (orgId: string, payload: CreateCampaignPayload) =>
    apiFetch<Campaign>(`/api/organizations/${orgId}/campaigns`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (orgId: string, id: string, payload: UpdateCampaignPayload) =>
    apiFetch<Campaign>(`/api/organizations/${orgId}/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
