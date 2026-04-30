import { useAuthStore, waitAuthHydration } from '../stores/authStore';
import type { ApiError } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CSRF_COOKIE_NAME = 'pb_csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-TOKEN';

let refreshPromise: Promise<void> | null = null;

function isMutatingMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase());
}

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const token = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${name}=`))
    ?.split('=')[1];

  return token ? decodeURIComponent(token) : null;
}

function appendCsrfHeader(headers: Headers, method?: string): void {
  if (!method || !isMutatingMethod(method)) {
    return;
  }

  const csrfToken = getCookieValue(CSRF_COOKIE_NAME);
  if (csrfToken && !headers.has(CSRF_HEADER_NAME)) {
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }
}

async function refreshTokens(): Promise<void> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  appendCsrfHeader(headers, 'POST');

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Refresh failed');
  }
}

async function getRefreshToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
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
  await waitAuthHydration();

  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  const method = (options.method ?? 'GET').toUpperCase();

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  appendCsrfHeader(headers, method);

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && endpoint !== '/api/auth/refresh') {
    try {
      await getRefreshToken();
      appendCsrfHeader(headers, method);

      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        method,
        headers,
        credentials: 'include',
      });
    } catch {
      useAuthStore.getState().logout();
      throw new Error('Session expired');
    }

    if (response.status === 401) {
      useAuthStore.getState().logout();
      throw new Error('Unauthorized');
    }
  }

  if (!response.ok) {
    let err: ApiError = {} as ApiError;
    try {
      err = await response.json();
    } catch {
      // no-op
    }

    throw new Error(getErrorMessage(err, response.status));
  }

  return readResponseBody<T>(response);
}
