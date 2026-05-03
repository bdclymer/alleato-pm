/**
 * Global API fetch wrapper.
 *
 * Every client-side API call should use this instead of raw `fetch()`.
 * It guarantees:
 *   1. JSON error bodies are always parsed (`{ error, details }`)
 *   2. The most specific error message is always surfaced
 *   3. Errors thrown are real Error objects with actionable messages
 *   4. Consistent typing for responses
 *
 * Usage:
 *   import { apiFetch } from "@/lib/api-client";
 *
 *   // Simple — throws on error with real message
 *   const data = await apiFetch<Project>(`/api/projects/${id}`);
 *
 *   // With options
 *   const data = await apiFetch<Project>(`/api/projects/${id}`, {
 *     method: "PUT",
 *     body: JSON.stringify(payload),
 *   });
 *
 *   // DELETE (returns null for 204 No Content)
 *   await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
 */

import { fetchWithTransientRouteRetry } from "@/lib/fetch-with-transient-route-retry";

/** Structured error from our API routes (see lib/api-error.ts) */
export interface ApiErrorBody {
  error?: string;
  details?: string | Array<{ field?: string; path?: string; message?: string }>;
  message?: string;
  error_code?: string;
  error_message?: string;
  where_it_failed?: string;
  request_id?: string;
}

/**
 * Error class that carries the HTTP status and parsed API error body.
 * Catch blocks can use `err.status`, `err.body`, or just `err.message`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;
  readonly requestId?: string;
  readonly errorCode?: string;
  readonly whereItFailed?: string;

  constructor(status: number, body: ApiErrorBody) {
    const message = getApiErrorMessage(status, body);
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.requestId = body.request_id;
    this.errorCode = body.error_code;
    this.whereItFailed = body.where_it_failed;
  }
}

function stringifyErrorDetails(details: ApiErrorBody["details"]): string | undefined {
  if (typeof details === "string" && details.trim()) {
    return details.trim();
  }

  if (Array.isArray(details)) {
    const joined = details
      .map((detail) => {
        const location = detail.path || detail.field;
        if (location && detail.message) {
          return `${location}: ${detail.message}`;
        }
        return detail.message;
      })
      .filter((detail): detail is string => Boolean(detail && detail.trim()))
      .join("; ");

    return joined || undefined;
  }

  return undefined;
}

function getApiErrorMessage(status: number, body: ApiErrorBody): string {
  const raw = `${body.error ?? ""} ${body.error_message ?? ""} ${body.message ?? ""}`.toLowerCase();
  if (
    status === 413 ||
    raw.includes("request entity too large") ||
    raw.includes("payload too large") ||
    raw.includes("function_payload_too_large")
  ) {
    return "Upload is too large for the server request limit. Reduce file size and try again.";
  }

  return (
    stringifyErrorDetails(body.details) ||
    body.error_message ||
    body.error ||
    body.message ||
    `Request failed (HTTP ${status})`
  );
}

/**
 * Fetch wrapper that guarantees meaningful error messages.
 *
 * - On success: returns parsed JSON (or null for 204).
 * - On failure: throws `ApiError` with the actual error message from the server.
 *
 * Never shows "Failed to X" — always shows the real reason.
 */
export async function apiFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  return performApiFetch<T>(url, init, (requestUrl, requestInit) =>
    fetch(requestUrl, requestInit),
  );
}

/**
 * Fetch wrapper with a client-side timeout.
 * Throws an Error with a descriptive message if the request exceeds `timeoutMs`.
 * Use for form submissions where a hung request would leave the UI stuck.
 */
export async function apiFetchWithTimeout<T = unknown>(
  url: string,
  init?: RequestInit,
  timeoutMs = 20_000,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await performApiFetch<T>(url, { ...init, signal: controller.signal }, (u, i) =>
      fetch(u, i),
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch wrapper with transient route retry for dev-time module compilation races.
 * Use for idempotent GET/HEAD requests when first-hit Next.js route compilation
 * may intermittently return a temporary 500.
 */
export async function apiFetchWithTransientRouteRetry<T = unknown>(
  url: string,
  init?: RequestInit,
  options?: { retries?: number; delayMs?: number },
): Promise<T> {
  return performApiFetch<T>(url, init, (requestUrl, requestInit) =>
    fetchWithTransientRouteRetry(requestUrl, requestInit, options),
  );
}

async function performApiFetch<T>(
  url: string,
  init: RequestInit | undefined,
  request: (url: string, init: RequestInit | undefined) => Promise<Response>,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await request(url, {
    ...init,
    credentials: init?.credentials ?? "same-origin",
    headers,
  });

  // 204 No Content (typical DELETE response)
  if (response.status === 204) {
    return null as T;
  }

  // Success — parse JSON
  if (response.ok) {
    // Some endpoints return empty body on success
    const text = await response.text();
    if (!text) return null as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }

  // Error — parse the JSON error body from our API routes
  const raw = await response.text().catch(() => "");
  let body: ApiErrorBody;
  try {
    const json = raw ? JSON.parse(raw) : {};
    body = {
      error: json.error,
      details: json.details,
      message: json.message,
      error_code: json.error_code,
      error_message: json.error_message,
      where_it_failed: json.where_it_failed,
      request_id: json.request_id || response.headers.get("x-request-id") || undefined,
    };
  } catch {
    // Response wasn't JSON — preserve raw text so callers see the real server message.
    body = {
      error: raw || `Request failed (HTTP ${response.status})`,
      request_id: response.headers.get("x-request-id") || undefined,
    };
  }

  throw new ApiError(response.status, body);
}

/**
 * Fetch wrapper for binary responses (e.g. PDFs).
 * Throws ApiError with parsed server details on non-2xx responses.
 */
export async function apiFetchBlob(
  url: string,
  init?: RequestInit,
): Promise<Blob> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    credentials: init?.credentials ?? "same-origin",
    headers,
  });

  if (response.ok) {
    return response.blob();
  }

  const raw = await response.text().catch(() => "");
  let body: ApiErrorBody;
  try {
    const json = raw ? JSON.parse(raw) : {};
    body = {
      error: json.error,
      details: json.details,
      message: json.message,
      error_code: json.error_code,
      error_message: json.error_message,
      where_it_failed: json.where_it_failed,
      request_id: json.request_id || response.headers.get("x-request-id") || undefined,
    };
  } catch {
    body = {
      error: raw || `Request failed (HTTP ${response.status})`,
      request_id: response.headers.get("x-request-id") || undefined,
    };
  }

  throw new ApiError(response.status, body);
}

/**
 * Helper for bulk operations with Promise.allSettled.
 * Extracts the actual error message from the first rejection.
 *
 * Usage:
 *   const results = await Promise.allSettled(ids.map(id => apiFetch(...)));
 *   const { succeeded, failed, firstError } = summarizeBulkResults(results);
 *
 *   if (succeeded > 0) toast.success(`${succeeded} items deleted`);
 *   if (failed > 0)    toast.error(firstError);
 */
export function summarizeBulkResults<T>(results: PromiseSettledResult<T>[]) {
  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<T> => r.status === "fulfilled",
  );
  const rejected = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected",
  );

  const firstError = rejected.length > 0
    ? rejected[0].reason instanceof Error
      ? rejected[0].reason.message
      : String(rejected[0].reason)
    : undefined;

  return {
    succeeded: fulfilled.length,
    failed: rejected.length,
    firstError: firstError || "Unknown error",
    allErrors: rejected.map((r) =>
      r.reason instanceof Error ? r.reason.message : String(r.reason),
    ),
  };
}
