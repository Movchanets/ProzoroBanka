import { apiFetch } from './api';
import type {
  PurchaseListItemDto,
  PurchaseDetailDto,
  DocumentDto,
  CreateDraftPurchaseRequest,
  AttachPurchaseToCampaignRequest,
  AddItemToWaybillRequest,
  UpdateWaybillItemRequest,
  CreatePurchaseRequest,
  UpdatePurchaseRequest,
  UpdateDocumentMetadataRequest,
  PurchaseStatus,
  DocumentType,
} from '@/types';

export const purchaseService = {
  // ── Purchases ──
  list: (organizationId: string, campaignId: string, status?: PurchaseStatus) => {
    const searchParams = new URLSearchParams();
    if (status !== undefined) {
      searchParams.set('status', String(status));
    }
    const query = searchParams.toString();
    return apiFetch<PurchaseListItemDto[]>(
      `/api/organizations/${organizationId}/campaigns/${campaignId}/purchases${query ? `?${query}` : ''}`
    );
  },

  getById: (organizationId: string, campaignId: string, purchaseId: string) =>
    apiFetch<PurchaseDetailDto>(
      `/api/organizations/${organizationId}/campaigns/${campaignId}/purchases/${purchaseId}`
    ),

  create: (organizationId: string, campaignId: string, payload: CreatePurchaseRequest) =>
    apiFetch<PurchaseDetailDto>(`/api/organizations/${organizationId}/campaigns/${campaignId}/purchases`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createDraft: (payload: CreateDraftPurchaseRequest) =>
    apiFetch<{ id: string }>(`/api/purchases/draft`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  attachToCampaign: (purchaseId: string, payload: AttachPurchaseToCampaignRequest) =>
    apiFetch<{ message: string }>(`/api/purchases/${purchaseId}/attach`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  addItemToWaybill: (documentId: string, payload: AddItemToWaybillRequest) =>
    apiFetch<{ id: string }>(`/api/purchases/documents/${documentId}/items`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateWaybillItem: (documentId: string, itemId: string, payload: UpdateWaybillItemRequest) =>
    apiFetch<DocumentDto>(`/api/purchases/documents/${documentId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteWaybillItem: (documentId: string, itemId: string) =>
    apiFetch<DocumentDto>(`/api/purchases/documents/${documentId}/items/${itemId}`, {
      method: 'DELETE',
    }),

  update: (organizationId: string, campaignId: string, purchaseId: string, payload: UpdatePurchaseRequest) =>
    apiFetch<PurchaseDetailDto>(
      `/api/organizations/${organizationId}/campaigns/${campaignId}/purchases/${purchaseId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  delete: (organizationId: string, campaignId: string, purchaseId: string) =>
    apiFetch<{ message: string }>(
      `/api/organizations/${organizationId}/campaigns/${campaignId}/purchases/${purchaseId}`,
      {
        method: 'DELETE',
      }
    ),

  // ── Documents ──
  uploadDocument: (
    organizationId: string,
    campaignId: string,
    purchaseId: string,
    file: File,
    type: DocumentType,
    documentDate?: string,
    amount?: number,
    counterpartyName?: string
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', String(type));
    
    if (documentDate) formData.append('documentDate', documentDate);
    if (amount !== undefined) formData.append('amount', String(amount));
    if (counterpartyName) formData.append('counterpartyName', counterpartyName);

    return apiFetch<DocumentDto>(
      `/api/organizations/${organizationId}/campaigns/${campaignId}/purchases/${purchaseId}/documents`,
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  updateDocumentMetadata: (
    organizationId: string,
    campaignId: string,
    purchaseId: string,
    documentId: string,
    payload: UpdateDocumentMetadataRequest
  ) =>
    apiFetch<DocumentDto>(
      `/api/organizations/${organizationId}/campaigns/${campaignId}/purchases/${purchaseId}/documents/${documentId}/metadata`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  deleteDocument: (
    organizationId: string,
    campaignId: string,
    purchaseId: string,
    documentId: string
  ) =>
    apiFetch<{ message: string }>(
      `/api/organizations/${organizationId}/campaigns/${campaignId}/purchases/${purchaseId}/documents/${documentId}`,
      {
        method: 'DELETE',
      }
    ),

  processDocumentOcr: (
    organizationId: string,
    campaignId: string,
    purchaseId: string,
    documentId: string,
  ) =>
    apiFetch<DocumentDto>(
      `/api/organizations/${organizationId}/campaigns/${campaignId}/purchases/${purchaseId}/documents/${documentId}/ocr`,
      {
        method: 'POST',
      }
    ),

  // ── Short routes (no campaignId in URL) ──

  getByIdShort: (organizationId: string, purchaseId: string) =>
    apiFetch<PurchaseDetailDto>(
      `/api/organizations/${organizationId}/purchases/${purchaseId}`
    ),

  updateShort: (organizationId: string, purchaseId: string, payload: UpdatePurchaseRequest) =>
    apiFetch<PurchaseDetailDto>(
      `/api/organizations/${organizationId}/purchases/${purchaseId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  deleteShort: (organizationId: string, purchaseId: string) =>
    apiFetch<{ message: string }>(
      `/api/organizations/${organizationId}/purchases/${purchaseId}`,
      {
        method: 'DELETE',
      }
    ),

  uploadDocumentShort: (
    organizationId: string,
    purchaseId: string,
    file: File,
    type: DocumentType,
    documentDate?: string,
    amount?: number,
    counterpartyName?: string
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', String(type));

    if (documentDate) formData.append('documentDate', documentDate);
    if (amount !== undefined) formData.append('amount', String(amount));
    if (counterpartyName) formData.append('counterpartyName', counterpartyName);

    return apiFetch<DocumentDto>(
      `/api/organizations/${organizationId}/purchases/${purchaseId}/documents`,
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  updateDocumentMetadataShort: (
    organizationId: string,
    purchaseId: string,
    documentId: string,
    payload: UpdateDocumentMetadataRequest
  ) =>
    apiFetch<DocumentDto>(
      `/api/organizations/${organizationId}/purchases/${purchaseId}/documents/${documentId}/metadata`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  deleteDocumentShort: (
    organizationId: string,
    purchaseId: string,
    documentId: string
  ) =>
    apiFetch<{ message: string }>(
      `/api/organizations/${organizationId}/purchases/${purchaseId}/documents/${documentId}`,
      {
        method: 'DELETE',
      }
    ),

  processDocumentOcrShort: (
    organizationId: string,
    purchaseId: string,
    documentId: string,
  ) =>
    apiFetch<DocumentDto>(
      `/api/organizations/${organizationId}/purchases/${purchaseId}/documents/${documentId}/ocr`,
      {
        method: 'POST',
      }
    ),

  // ── Public ──
  publicList: (campaignId: string) =>
    apiFetch<PurchaseDetailDto[]>(`/api/public/campaigns/${campaignId}/purchases`),
};
