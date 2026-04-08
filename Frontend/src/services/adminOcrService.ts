import { apiFetch } from './api';
import type { OcrModelConfig } from '@/types';

export interface AddOcrModelPayload {
  name: string;
  modelIdentifier: string;
  provider: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface UpdateOcrModelPayload {
  isActive?: boolean;
  isDefault?: boolean;
}

export const adminOcrService = {
  list: () => apiFetch<OcrModelConfig[]>('/api/admin/settings/ocr-models'),

  add: (payload: AddOcrModelPayload) =>
    apiFetch<string>('/api/admin/settings/ocr-models', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateOcrModelPayload) =>
    apiFetch<string>(`/api/admin/settings/ocr-models/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...payload }),
    }),
};
