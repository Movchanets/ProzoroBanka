import { apiFetch } from './api';
import type {
  Campaign,
  CampaignDetail,
  ReceiptListItem,
  ReceiptPipeline,
  CampaignTransaction,
  CampaignStats,
  CampaignStatus,
  ChangeCampaignStatusPayload,
  CreateCampaignPayload,
  MonobankClientInfo,
  SetupMonobankWebhookPayload,
  UpdateCampaignBalancePayload,
  UpdateCampaignPayload,
  CampaignPhoto,
  CampaignPost,
  CreateCampaignPostPayload,
  UpdateCampaignPostPayload,
  ReorderCampaignPhotosPayload,
  UpdateCampaignPhotoPayload,
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

  getMonobankJars: (token: string) =>
    apiFetch<MonobankClientInfo>('/api/campaigns/monobank/jars', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  setupMonobankWebhook: (payload: SetupMonobankWebhookPayload) =>
    apiFetch<{ message: string }>('/api/campaigns/monobank/setup-webhook', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getTransactions: (id: string, page = 1, pageSize = 20) =>
    apiFetch<CampaignTransaction[]>(
      `/api/campaigns/${id}/transactions?page=${page}&pageSize=${pageSize}`,
    ),

  getReceipts: (id: string) =>
    apiFetch<ReceiptListItem[]>(`/api/campaigns/${id}/receipts`),

  attachReceipt: (id: string, receiptId: string) =>
    apiFetch<ReceiptPipeline>(`/api/campaigns/${id}/receipts/${receiptId}`, {
      method: 'POST',
    }),

  detachReceipt: (id: string, receiptId: string) =>
    apiFetch<void>(`/api/campaigns/${id}/receipts/${receiptId}`, {
      method: 'DELETE',
    }),

  updateBalanceManual: (id: string, payload: UpdateCampaignBalancePayload) =>
    apiFetch<{ message: string }>(`/api/campaigns/${id}/balance/manual`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getPhotos: (id: string) =>
    apiFetch<CampaignPhoto[]>(`/api/campaigns/${id}/photos`),

  addPhoto: (id: string, file: File, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    return apiFetch<CampaignPhoto>(`/api/campaigns/${id}/photos`, {
      method: 'POST',
      body: formData,
    });
  },

  deletePhoto: (id: string, photoId: string) =>
    apiFetch<void>(`/api/campaigns/${id}/photos/${photoId}`, {
      method: 'DELETE',
    }),

  reorderPhotos: (id: string, payload: ReorderCampaignPhotosPayload) =>
    apiFetch<void>(`/api/campaigns/${id}/photos/reorder`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  updatePhoto: (id: string, photoId: string, payload: UpdateCampaignPhotoPayload) =>
    apiFetch<CampaignPhoto>(`/api/campaigns/${id}/photos/${photoId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getPosts: (id: string) =>
    apiFetch<CampaignPost[]>(`/api/campaigns/${id}/posts`),

  createPost: (id: string, payload: CreateCampaignPostPayload) => {
    const formData = new FormData();
    if (payload.postContentJson) {
      formData.append('postContentJson', payload.postContentJson);
    }

    payload.images.forEach((image) => {
      formData.append('images', image);
    });

    return apiFetch<CampaignPost>(`/api/campaigns/${id}/posts`, {
      method: 'POST',
      body: formData,
    });
  },

  updatePost: (id: string, postId: string, payload: UpdateCampaignPostPayload) =>
    apiFetch<CampaignPost>(`/api/campaigns/${id}/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deletePost: (id: string, postId: string) =>
    apiFetch<void>(`/api/campaigns/${id}/posts/${postId}`, {
      method: 'DELETE',
    }),
};
