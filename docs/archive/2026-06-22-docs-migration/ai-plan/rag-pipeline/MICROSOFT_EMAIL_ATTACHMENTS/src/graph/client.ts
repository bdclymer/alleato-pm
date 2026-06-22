import { isRetryableHttpStatus, withRetry } from "../util/retry";

const GRAPH_DEFAULT_BASE_URL = "https://graph.microsoft.com/v1.0";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let cachedToken: { accessToken: string; expiresAt: number } | undefined;

export interface GraphRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
}

export async function graphFetch<T>(path: string, options: GraphRequestOptions = {}): Promise<T> {
  const accessToken = await getGraphAccessToken();
  const url = path.startsWith("https://") ? path : `${graphBaseUrl()}${path}`;

  return withRetry(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), graphTimeoutMs());
      const response = await fetch(url, {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        const errorText = await response.text();
        throw new GraphHttpError(response.status, response.statusText, errorText);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    },
    {
      attempts: 5,
      initialDelayMs: 750,
      maxDelayMs: 15_000,
      shouldRetry: (error) =>
        error instanceof GraphHttpError && isRetryableHttpStatus(error.status),
    },
  );
}

export async function getGraphAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.accessToken;
  }

  const tenantId = requiredEnv("MICROSOFT_TENANT_ID");
  const clientId = requiredEnv("MICROSOFT_CLIENT_ID");
  const clientSecret = requiredEnv("MICROSOFT_CLIENT_SECRET");
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const token = await withRetry(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), graphTimeoutMs());
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        throw new GraphHttpError(response.status, response.statusText, await response.text());
      }

      return (await response.json()) as TokenResponse;
    },
    {
      attempts: 5,
      shouldRetry: (error) =>
        error instanceof GraphHttpError && isRetryableHttpStatus(error.status),
    },
  );

  cachedToken = {
    accessToken: token.access_token,
    expiresAt: now + token.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

export class GraphHttpError extends Error {
  constructor(
    readonly status: number,
    statusText: string,
    readonly responseBody: string,
  ) {
    super(`Microsoft Graph request failed: ${status} ${statusText} ${responseBody}`);
    this.name = "GraphHttpError";
  }
}

function graphBaseUrl(): string {
  return process.env.MICROSOFT_GRAPH_BASE_URL ?? GRAPH_DEFAULT_BASE_URL;
}

function graphTimeoutMs(): number {
  return Number(process.env.MICROSOFT_GRAPH_TIMEOUT_MS ?? 30_000);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
