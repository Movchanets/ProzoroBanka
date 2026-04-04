import { apiFetch } from './api';
import type {
  CreateOrganizationPayload,
  Organization,
  OrganizationDetail,
  OrganizationMember,
  OrganizationStateRegistrySettings,
  StateRegistryProvider,
  UpdateMemberRolePayload,
  UpdateOrganizationPayload,
} from '../types';

export const organizationService = {
  create: (payload: CreateOrganizationPayload) =>
    apiFetch<Organization>('/api/organizations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMyOrganizations: () =>
    apiFetch<Organization[]>('/api/organizations/my'),

  getOrganization: (id: string) =>
    apiFetch<OrganizationDetail>(`/api/organizations/${id}`),

  update: (id: string, payload: UpdateOrganizationPayload) =>
    apiFetch<Organization>(`/api/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  uploadLogo: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<Organization>(`/api/organizations/${id}/logo`, {
      method: 'POST',
      body: formData,
    });
  },

  delete: (id: string) =>
    apiFetch<void>(`/api/organizations/${id}`, { method: 'DELETE' }),

  getMembers: (id: string) =>
    apiFetch<OrganizationMember[]>(`/api/organizations/${id}/members`),

  updateMember: (orgId: string, userId: string, payload: UpdateMemberRolePayload) =>
    apiFetch<OrganizationMember>(`/api/organizations/${orgId}/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({
        newRole: payload.role,
        newPermissionsFlags: payload.permissions ?? 0,
      }),
    }),

  removeMember: (orgId: string, userId: string) =>
    apiFetch<void>(`/api/organizations/${orgId}/members/${userId}`, {
      method: 'DELETE',
    }),

  leave: (id: string) =>
    apiFetch<void>(`/api/organizations/${id}/leave`, { method: 'POST' }),

  generateInviteLink: (id: string) =>
    apiFetch<{ token: string }>(`/api/organizations/${id}/invite-link`, {
      method: 'POST',
    }),

  inviteByEmail: (id: string, payload: { email: string; role: number }) =>
    apiFetch<void>(`/api/organizations/${id}/invite`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getStateRegistrySettings: (id: string) =>
    apiFetch<OrganizationStateRegistrySettings>(`/api/organizations/${id}/state-registry-settings`),

  upsertStateRegistryCredential: (id: string, provider: StateRegistryProvider, apiKey: string) =>
    apiFetch<{ message: string }>(`/api/organizations/${id}/state-registry-credentials/${provider}`, {
      method: 'PUT',
      body: JSON.stringify({ apiKey }),
    }),

  deleteStateRegistryCredential: (id: string, provider: StateRegistryProvider) =>
    apiFetch<{ message: string }>(`/api/organizations/${id}/state-registry-credentials/${provider}`, {
      method: 'DELETE',
    }),
};
