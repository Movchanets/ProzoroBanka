import { apiFetch } from './api';
import type { AuthResponse } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
  turnstileToken: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  turnstileToken: string;
}

export interface ForgotPasswordPayload {
  email: string;
  turnstileToken: string;
}

export interface GoogleLoginPayload {
  idToken: string;
  turnstileToken: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export const authService = {
  login: (payload: LoginPayload) =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  register: (payload: RegisterPayload) =>
    apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  googleLogin: (payload: GoogleLoginPayload) =>
    apiFetch<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    apiFetch<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resetPassword: (payload: ResetPasswordPayload) =>
    apiFetch<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  refresh: () =>
    apiFetch<void>('/api/auth/refresh', {
      method: 'POST',
    }),

  logout: () =>
    apiFetch<void>('/api/auth/logout', {
      method: 'POST',
    }),
};
