import { apiFetch } from './api';
import type { ProfileUpdatePayload, User } from '../types';

export const profileService = {
  getProfile: () => apiFetch<User>('/api/auth/me'),

  updateProfile: (payload: ProfileUpdatePayload) =>
    apiFetch<User>('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiFetch<User>('/api/auth/me/avatar', {
      method: 'POST',
      body: formData,
    });
  },
};