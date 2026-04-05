import { apiFetch } from './api';
import type { ReceiptPipeline, UpdateReceiptOcrDraftRequest } from '@/types';

export const receiptService = {
  uploadDraft: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<ReceiptPipeline>('/api/receipts/draft', {
      method: 'POST',
      body: formData,
    });
  },

  extract: (receiptId: string, organizationId: string, file: File) => {
    const formData = new FormData();
    formData.append('organizationId', organizationId);
    formData.append('file', file);

    return apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/extract`, {
      method: 'POST',
      body: formData,
    });
  },

  verify: (receiptId: string, organizationId: string) =>
    apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ organizationId }),
    }),

  updateOcrDraft: (receiptId: string, payload: UpdateReceiptOcrDraftRequest) =>
    apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/ocr-draft`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  activate: (receiptId: string) =>
    apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/activate`, {
      method: 'POST',
    }),

  retry: (receiptId: string) =>
    apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}/retry`, {
      method: 'POST',
    }),

  getById: (receiptId: string) => apiFetch<ReceiptPipeline>(`/api/receipts/${receiptId}`),
};
