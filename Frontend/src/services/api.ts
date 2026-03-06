import { useAuthStore } from '../stores/authStore';
import type { ApiError, TokenResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let isRefreshing = false;
let refreshPromise: Promise<TokenResponse> | null = null;

async function refreshTokens(): Promise<TokenResponse> {
  const { accessToken, refreshToken } = useAuthStore.getState();
  if (!accessToken || !refreshToken) throw new Error('No tokens');

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, refreshToken }),
  });

  if (!response.ok) throw new Error('Refresh failed');
  return response.json();
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const store = useAuthStore.getState();
  let token = store.accessToken;

  // Якщо токен скоро прострочиться (< 1 хв) — оновлюємо проактивно
  if (token && store.accessTokenExpiry) {
    const expiresIn = new Date(store.accessTokenExpiry).getTime() - Date.now();
    if (expiresIn < 60_000 && store.refreshToken) {
      try {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = refreshTokens();
        }
        const tokens = await refreshPromise!;
        useAuthStore.getState().setTokens(
          tokens.accessToken, tokens.refreshToken, tokens.accessTokenExpiry
        );
        token = tokens.accessToken;
      } catch {
        useAuthStore.getState().logout();
        throw new Error('Session expired');
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Спроба оновити токен
    if (store.refreshToken && !isRefreshing) {
      try {
        isRefreshing = true;
        const tokens = await refreshTokens();
        useAuthStore.getState().setTokens(
          tokens.accessToken, tokens.refreshToken, tokens.accessTokenExpiry
        );
        isRefreshing = false;

        // Повтор оригінального запиту
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`,
            ...options.headers,
          },
        });

        if (!retryResponse.ok) {
          const err: ApiError = await retryResponse.json().catch(() => ({}));
          throw new Error(err.error || `API Error: ${retryResponse.status}`);
        }
        return retryResponse.json();
      } catch {
        isRefreshing = false;
        useAuthStore.getState().logout();
        throw new Error('Session expired');
      }
    }

    useAuthStore.getState().logout();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const err: ApiError = await response.json().catch(() => ({}));
    throw new Error(err.error || err.title || `API Error: ${response.status}`);
  }

  return response.json();
}
