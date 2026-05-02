import { useAuthStore, waitAuthHydration } from "../stores/authStore";
import type { ApiError } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const CSRF_COOKIE_NAME = "pb_csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-TOKEN";

let refreshPromise: Promise<void> | null = null;

function isMutatingMethod(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method.toUpperCase());
}

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
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
  const headers = new Headers({ "Content-Type": "application/json" });
  appendCsrfHeader(headers, "POST");

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Refresh failed");
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

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  return (await response.text()) as T;
}

function getErrorMessage(error: ApiError, status: number): string {
  const firstValidationError = error.errors
    ? Object.values(error.errors).flat()[0]
    : undefined;

  return (
    error.error ||
    error.message ||
    firstValidationError ||
    error.title ||
    `API Error: ${status}`
  );
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  await waitAuthHydration();

  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  const method = (options.method ?? "GET").toUpperCase();

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  appendCsrfHeader(headers, method);

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  const isCsrfFailure = (res: Response, body: any) =>
    res.status === 403 &&
    (body?.error?.toLowerCase().includes("csrf validation failed") ||
      body?.Error?.toLowerCase().includes("csrf validation failed") ||
      (typeof body === "string" && body.toLowerCase().includes("csrf validation failed")));

  if (response.status === 401 && endpoint !== "/api/auth/refresh") {
    try {
      await getRefreshToken();
      appendCsrfHeader(headers, method);

      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        method,
        headers,
        credentials: "include",
      });
    } catch {
      useAuthStore.getState().logout();
      throw new Error("Session expired");
    }

    if (response.status === 401) {
      useAuthStore.getState().logout();
      throw new Error("Unauthorized");
    }
  }

  if (!response.ok) {
    let err: ApiError = {} as ApiError;
    let body: any;
    try {
      body = await response.json();
      err = body;
    } catch {
      // If JSON parsing fails, try reading as text for the CSRF check
      try {
        body = await response.clone().text();
      } catch {
        // no-op
      }
    }

    // Handle CSRF recovery: refresh token and retry once
    if (isCsrfFailure(response, body)) {
      try {
        await getRefreshToken();
        appendCsrfHeader(headers, method);

        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          method,
          headers,
          credentials: "include",
        });

        if (response.ok) {
          return readResponseBody<T>(response);
        }

        // If retry also fails with CSRF, parse the new error
        try {
          err = await response.json();
        } catch {
          // no-op
        }
      } catch (refreshErr) {
        throw new Error("CSRF recovery failed: " + (refreshErr instanceof Error ? refreshErr.message : "Unknown error"));
      }
    }

    throw new Error(getErrorMessage(err, response.status));
  }

  return readResponseBody<T>(response);
}
