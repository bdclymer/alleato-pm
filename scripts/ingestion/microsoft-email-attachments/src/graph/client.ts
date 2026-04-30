import { isRetryableHttpStatus, withRetry } from "../util/retry";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

let cachedToken: { accessToken: string; expiresAt: number } | undefined;

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

export async function graphFetch<T>(
  path: string,
  options: { headers?: Record<string, string> } = {},
): Promise<T> {
  const accessToken = await getGraphAccessToken();
  const url = path.startsWith("https://") ? path : `${GRAPH_BASE_URL}${path}`;

  return withRetry(
    async () => {
      const response = await fetchWithTimeout(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          ...options.headers,
        },
      });
      if (!response.ok) {
        throw new GraphHttpError(response.status, response.statusText, await response.text());
      }
      return (await response.json()) as T;
    },
    {
      attempts: 5,
      initialDelayMs: 750,
      maxDelayMs: 15_000,
      shouldRetry: (error) => error instanceof GraphHttpError && isRetryableHttpStatus(error.status),
    },
  );
}

async function getGraphAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.accessToken;
  }

  const tenantId = requiredEnv("MICROSOFT_TENANT_ID");
  const body = new URLSearchParams({
    client_id: requiredEnv("MICROSOFT_CLIENT_ID"),
    client_secret: requiredEnv("MICROSOFT_CLIENT_SECRET"),
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetchWithTimeout(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!response.ok) {
    throw new GraphHttpError(response.status, response.statusText, await response.text());
  }

  const token = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { accessToken: token.access_token, expiresAt: now + token.expires_in * 1000 };
  return cachedToken.accessToken;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.MICROSOFT_GRAPH_TIMEOUT_MS ?? 30_000),
  );
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
