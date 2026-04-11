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

/** Structured error from our API routes (see lib/api-error.ts) */
export interface ApiErrorBody {
  error: string;
  details?: string;
}

/**
 * Error class that carries the HTTP status and parsed API error body.
 * Catch blocks can use `err.status`, `err.body`, or just `err.message`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    // Prefer `details` (the specific reason) over `error` (the category)
    const message = body.details || body.error;
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
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
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
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
  let body: ApiErrorBody;
  try {
    const json = await response.json();
    body = {
      error: json.error || json.message || `Request failed (HTTP ${response.status})`,
      details: typeof json.details === "string"
        ? json.details
        : Array.isArray(json.details)
          ? json.details
            .map((d: { field?: string; message?: string }) =>
              d.field ? `${d.field}: ${d.message}` : d.message,
            )
            .filter(Boolean)
            .join("; ")
          : undefined,
    };
  } catch {
    // Response wasn't JSON — use status text
    const text = await response.text().catch(() => "");
    body = {
      error: text || `Request failed (HTTP ${response.status})`,
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
    headers,
  });

  if (response.ok) {
    return response.blob();
  }

  let body: ApiErrorBody;
  try {
    const json = await response.json();
    body = {
      error: json.error || json.message || `Request failed (HTTP ${response.status})`,
      details: typeof json.details === "string"
        ? json.details
        : Array.isArray(json.details)
          ? json.details
            .map((d: { field?: string; message?: string }) =>
              d.field ? `${d.field}: ${d.message}` : d.message,
            )
            .filter(Boolean)
            .join("; ")
          : undefined,
    };
  } catch {
    const text = await response.text().catch(() => "");
    body = {
      error: text || `Request failed (HTTP ${response.status})`,
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
