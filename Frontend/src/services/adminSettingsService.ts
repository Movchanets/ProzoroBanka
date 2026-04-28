import { apiFetch } from './api';
import type { AdminGeneralSettingsDto, AdminPlansSettingsDto } from '@/types/admin';

export const adminSettingsService = {
  updateGeneralSettings: (payload: AdminGeneralSettingsDto) =>
    apiFetch<AdminGeneralSettingsDto>('/api/admin/settings/general', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  updatePlansSettings: (payload: AdminPlansSettingsDto) =>
    apiFetch<AdminPlansSettingsDto>('/api/admin/settings/plans', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
