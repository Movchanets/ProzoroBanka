import { useAuthStore } from '../stores/authStore';
import type { ApiError, TokenResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let refreshPromise: Promise<string> | null = null;

async function refreshTokens(): Promise<string> {
  const { accessToken, refreshToken } = useAuthStore.getState();
  if (!accessToken || !refreshToken) throw new Error('No tokens');

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, refreshToken }),
  });

  if (!response.ok) throw new Error('Refresh failed');
  
  const tokens: TokenResponse = await response.json();
  useAuthStore.getState().setTokens(
    tokens.accessToken, 
    tokens.refreshToken, 
    tokens.accessTokenExpiry
  );
  
  return tokens.accessToken;
}

// Допоміжна функція, яка гарантує, що рефреш буде лише один одночасно
async function getRefreshToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      // Очищаємо проміс після завершення (успішного чи ні)
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
  const store = useAuthStore.getState();
  let token = store.accessToken;

  // 1. Проактивне оновлення токена (< 60 сек)
  if (token && store.accessTokenExpiry) {
    const expiresIn = new Date(store.accessTokenExpiry).getTime() - Date.now();
    if (expiresIn < 60_000 && store.refreshToken) {
      try {
        token = await getRefreshToken();
      } catch {
        useAuthStore.getState().logout();
        throw new Error('Session expired');
      }
    }
  }

  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 2. Реактивне оновлення токена (отримали 401)
  if (response.status === 401) {
    if (store.refreshToken) {
      try {
        // Чекаємо на новий токен
        token = await getRefreshToken();

        // Повторюємо оригінальний запит з новим токеном
        headers.set('Authorization', `Bearer ${token}`);
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } catch {
        useAuthStore.getState().logout();
        throw new Error('Session expired');
      }
    } else {
      useAuthStore.getState().logout();
      throw new Error('Unauthorized');
    }
  }

  // 3. Обробка помилок API
  if (!response.ok) {
    let err: ApiError = {} as ApiError;
    try {
      err = await response.json();
    } catch {
      // Ігноруємо помилки парсингу (наприклад, якщо бекенд повернув HTML сторінку 500)
    }
    throw new Error(getErrorMessage(err, response.status));
  }

  return readResponseBody<T>(response);
}