import Cookies from "js-cookie";
import { useAuthStore, waitAuthHydration } from "../stores/authStore";
import type { ApiError } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const CSRF_COOKIE_NAME = "pb_csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-TOKEN";

const AUTH_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/google",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

let refreshPromise: Promise<void> | null = null;

/**
 * Checks if the method is one that requires CSRF protection
 */
function isMutatingMethod(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method.toUpperCase());
}

/**
 * Gets a cookie value by name using js-cookie
 */
function getCookieValue(name: string): string | null {
  return Cookies.get(name) ?? null;
}

/**
 * Appends the CSRF header to the provided Headers object if applicable
 */
function appendCsrfHeader(headers: Headers, method?: string): void {
  if (!method || !isMutatingMethod(method)) return;

  const csrfToken = getCookieValue(CSRF_COOKIE_NAME);
  if (csrfToken && !headers.has(CSRF_HEADER_NAME)) {
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }
}

/**
 * Performs the actual token refresh call
 */
async function refreshTokens(): Promise<void> {
  const headers = new Headers({ "Content-Type": "application/json" });
  appendCsrfHeader(headers, "POST");

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers,
    credentials: "include",
  });

  if (!response.ok) throw new Error("Refresh failed");
}

/**
 * Prevents multiple concurrent refresh calls
 */
async function getRefreshToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Detects if the response is a CSRF validation failure
 */
async function detectCsrfFailure(response: Response): Promise<boolean> {
  if (response.status !== 403) return false;
  
  try {
    const body = await response.clone().json();
    const msg = (body?.error || body?.Error || "").toLowerCase();
    return msg.includes("csrf validation failed");
  } catch {
    const text = await response.clone().text().catch(() => "");
    return text.toLowerCase().includes("csrf validation failed");
  }
}

/**
 * Parses response body based on content type
 */
async function readResponseBody<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }
  return (await response.text()) as T;
}

/**
 * Extracts a human-readable error message from the API error object
 */
function getErrorMessage(error: ApiError, status: number): string {
  const firstValError = error.errors ? Object.values(error.errors).flat()[0] : undefined;
  return error.error || error.message || firstValError || error.title || `API Error: ${status}`;
}

/**
 * Main API fetch wrapper with automatic 401/403(CSRF) retry logic
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  await waitAuthHydration();

  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  appendCsrfHeader(headers, method);

  const executeFetch = () => fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  let response = await executeFetch();

  // Handle Auth/CSRF failures with a single retry
  const isUnauthorized = response.status === 401 && endpoint !== "/api/auth/refresh" && !AUTH_ENDPOINTS.includes(endpoint);
  const isCsrf = await detectCsrfFailure(response);

  if (isUnauthorized || isCsrf) {
    try {
      await getRefreshToken();
      appendCsrfHeader(headers, method); // Refresh might have updated CSRF token
      response = await executeFetch();
    } catch (err) {
      if (isUnauthorized) {
        useAuthStore.getState().logout();
        throw new Error("Session expired");
      }
      throw err;
    }

    if (response.status === 401 && !AUTH_ENDPOINTS.includes(endpoint)) {
      useAuthStore.getState().logout();
      throw new Error("Unauthorized");
    }
  }

  if (!response.ok) {
    let err: ApiError = {} as ApiError;
    try {
      err = await response.json();
    } catch {
      // Fallback for non-JSON errors
    }
    throw new Error(getErrorMessage(err, response.status));
  }

  return readResponseBody<T>(response);
}
