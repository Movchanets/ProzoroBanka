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

async function readResponseBody<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return (await response.text()) as T;
}

function getErrorMessage(error: ApiError, status: number): string {
  const firstValidationError = error.errors
    ? Object.values(error.errors).flat()[0]
    : undefined;

  return error.error
    || error.message
    || firstValidationError
    || error.title
    || `API Error: ${status}`;
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

  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...Object.fromEntries(headers.entries()),
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
            Authorization: `Bearer ${tokens.accessToken}`,
            ...Object.fromEntries(headers.entries()),
          },
        });

        if (!retryResponse.ok) {
          const err: ApiError = await retryResponse.json().catch(() => ({}));
          throw new Error(getErrorMessage(err, retryResponse.status));
        }

        return readResponseBody<T>(retryResponse);
      } catch {
        isRefreshing = false;
        useAuthStore.getState().logout();
        throw new Error('Session expired');
      }
    }

    let errorMsg = 'Unauthorized';
    try {
      const errResponse = await response.clone().json();
      errorMsg = getErrorMessage(errResponse, response.status) || 'Unauthorized';
    } catch {
      // Ignore parsing errors
    }

    useAuthStore.getState().logout();
    throw new Error(errorMsg);
  }

  if (!response.ok) {
    const err: ApiError = await response.json().catch(() => ({}));
    throw new Error(getErrorMessage(err, response.status));
  }

  return readResponseBody<T>(response);
}
