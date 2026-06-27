/**
 * Microsoft Graph client — app-only (client credentials).
 *
 * Reads Teams meeting transcripts + recordings tenant-wide. Requires the
 * application permissions OnlineMeetingTranscript.Read.All,
 * OnlineMeetingRecording.Read.All, OnlineMeetings.Read.All (admin-consented)
 * AND a Teams application access policy granted to MS_CLIENT_ID — otherwise
 * transcript/recording reads return 403.
 */
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export class MeetingAccessError extends Error {}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }
  const tenant = requireEnv("MS_TENANT_ID");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: requireEnv("MS_CLIENT_ID"),
    client_secret: requireEnv("MS_CLIENT_SECRET"),
    scope: "https://graph.microsoft.com/.default",
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    { method: "POST", body },
  );
  if (!res.ok) {
    throw new Error(`Graph token request failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function graphFetch(url: string): Promise<Response> {
  const token = await getToken();
  const res = await fetch(url.startsWith("https://") ? url : `${GRAPH_BASE}${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 403) {
    throw new MeetingAccessError(
      "Graph 403 — missing Teams application access policy or un-consented OnlineMeeting*.Read.All permissions.",
    );
  }
  return res;
}

export async function graphGet<T = unknown>(url: string): Promise<T> {
  const res = await graphFetch(url);
  if (!res.ok) throw new Error(`Graph GET ${url} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

/** Page through @odata.nextLink with a safety cap. */
export async function graphGetAllPages<T = Record<string, unknown>>(
  path: string,
  maxPages = 20,
): Promise<T[]> {
  const items: T[] = [];
  let url: string | null = path;
  let pages = 0;
  while (url && pages < maxPages) {
    const data: { value?: T[]; "@odata.nextLink"?: string } = await graphGet(url);
    items.push(...(data.value ?? []));
    url = data["@odata.nextLink"] ?? null;
    pages++;
  }
  return items;
}

export async function graphDownload(url: string): Promise<ArrayBuffer> {
  const res = await graphFetch(url);
  if (!res.ok) throw new Error(`Graph download failed: ${res.status}`);
  return res.arrayBuffer();
}

export async function graphDownloadText(url: string): Promise<string> {
  const res = await graphFetch(url);
  if (!res.ok) throw new Error(`Graph download failed: ${res.status}`);
  return res.text();
}
