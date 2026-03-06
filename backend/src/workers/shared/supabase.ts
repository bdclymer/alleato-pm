/**
 * Supabase Client Utilities
 */

import type { Env, PipelineStage } from "./types";

// -----------------------------------------------------------------------------
// Base Request Helper
// -----------------------------------------------------------------------------

export async function supabaseRequest(
  env: Env,
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<unknown> {
  const isUpsert = path.includes("on_conflict=");

  const headers: Record<string, string> = {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  if (method === "POST") {
    headers["Prefer"] = isUpsert
      ? "return=representation,resolution=merge-duplicates"
      : "return=representation";
  } else if (method === "PATCH") {
    headers["Prefer"] = "return=representation";
  }

  const tableName = path.split("?")[0];
  console.log(`[Supabase] ${method} ${tableName}`);

  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Supabase] Error: ${error}`);
    throw new Error(`Supabase error (${response.status}): ${error}`);
  }

  if (method === "GET" || method === "POST" || method === "PATCH") {
    const json = await response.json();
    console.log(
      `[Supabase] Success: ${Array.isArray(json) ? json.length : 1} record(s)`
    );
    return json;
  }

  return null;
}

// -----------------------------------------------------------------------------
// Storage Helpers
// -----------------------------------------------------------------------------

export async function fetchStorageFile(
  env: Env,
  bucket: string,
  path: string
): Promise<string | null> {
  try {
    const url = `${env.SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURIComponent(path)}`;

    console.log(`[Storage] Fetching: ${path}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        apikey: env.SUPABASE_SERVICE_KEY,
      },
    });

    if (!response.ok) {
      console.error(`[Storage] Error: ${response.status}`);
      return null;
    }

    const content = await response.text();
    console.log(`[Storage] Fetched ${content.length} chars`);
    return content;
  } catch (err) {
    console.error("[Storage] Fetch error:", err);
    return null;
  }
}

export async function uploadStorageFile(
  env: Env,
  bucket: string,
  path: string,
  content: string
): Promise<string | null> {
  try {
    const url = `${env.SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        apikey: env.SUPABASE_SERVICE_KEY,
        "Content-Type": "text/plain",
        "x-upsert": "true",
      },
      body: content,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Storage] Upload error: ${error}`);
      return null;
    }

    return `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  } catch (err) {
    console.error("[Storage] Upload error:", err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Job Status Helpers
// -----------------------------------------------------------------------------

export async function getJob(
  env: Env,
  firefliesId: string
): Promise<{ id: string; stage: string; metadata_id: string | null } | null> {
  const result = (await supabaseRequest(
    env,
    `fireflies_ingestion_jobs?fireflies_id=eq.${encodeURIComponent(firefliesId)}&select=id,stage,metadata_id`,
    "GET"
  )) as Array<{ id: string; stage: string; metadata_id: string | null }>;

  return result && result.length > 0 ? result[0] : null;
}

export async function createJob(
  env: Env,
  firefliesId: string,
  stage: PipelineStage = "pending"
): Promise<string> {
  const result = (await supabaseRequest(env, "fireflies_ingestion_jobs", "POST", {
    fireflies_id: firefliesId,
    stage,
    attempt_count: 1,
    last_attempt_at: new Date().toISOString(),
  })) as Array<{ id: string }>;

  return result[0].id;
}

export async function updateJobStage(
  env: Env,
  firefliesId: string,
  stage: PipelineStage,
  metadataId?: string,
  errorMessage?: string
): Promise<void> {
  const existing = await getJob(env, firefliesId);

  const updateData: Record<string, unknown> = {
    stage,
    last_attempt_at: new Date().toISOString(),
  };

  if (metadataId) {
    updateData.metadata_id = metadataId;
  }

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  if (existing) {
    updateData.attempt_count = (existing as any).attempt_count + 1 || 1;
    await supabaseRequest(
      env,
      `fireflies_ingestion_jobs?id=eq.${existing.id}`,
      "PATCH",
      updateData
    );
  } else {
    await supabaseRequest(env, "fireflies_ingestion_jobs", "POST", {
      fireflies_id: firefliesId,
      ...updateData,
      attempt_count: 1,
    });
  }
}

// -----------------------------------------------------------------------------
// Metadata Helpers
// -----------------------------------------------------------------------------

export async function getMetadataByFirefliesId(
  env: Env,
  firefliesId: string
): Promise<{ id: string; url?: string } | null> {
  const result = (await supabaseRequest(
    env,
    `document_metadata?fireflies_id=eq.${encodeURIComponent(firefliesId)}&select=id,url`,
    "GET"
  )) as Array<{ id: string; url?: string }>;

  return result && result.length > 0 ? result[0] : null;
}

export async function getMetadataById(
  env: Env,
  metadataId: string
): Promise<Record<string, unknown> | null> {
  const result = (await supabaseRequest(
    env,
    `document_metadata?id=eq.${metadataId}&select=*`,
    "GET"
  )) as Array<Record<string, unknown>>;

  return result && result.length > 0 ? result[0] : null;
}

export async function updateMetadataStatus(
  env: Env,
  metadataId: string,
  status: string
): Promise<void> {
  await supabaseRequest(env, `document_metadata?id=eq.${metadataId}`, "PATCH", {
    status,
  });
}

// -----------------------------------------------------------------------------
// Segment Helpers
// -----------------------------------------------------------------------------

export async function getSegmentsByMetadataId(
  env: Env,
  metadataId: string
): Promise<Array<Record<string, unknown>>> {
  return (await supabaseRequest(
    env,
    `meeting_segments?metadata_id=eq.${metadataId}&select=*&order=segment_index`,
    "GET"
  )) as Array<Record<string, unknown>>;
}

// -----------------------------------------------------------------------------
// Check if already processed (for deduplication)
// -----------------------------------------------------------------------------

export async function isAlreadyProcessed(
  env: Env,
  firefliesId: string
): Promise<boolean> {
  const job = await getJob(env, firefliesId);
  return job !== null && job.stage !== "error" && job.stage !== "pending";
}

// -----------------------------------------------------------------------------
// Content Hash Deduplication
// -----------------------------------------------------------------------------

export async function checkExistingByContentHash(
  env: Env,
  contentHash: string
): Promise<{ id: string; fireflies_id: string; url: string } | null> {
  const result = (await supabaseRequest(
    env,
    `document_metadata?content_hash=eq.${encodeURIComponent(contentHash)}&select=id,fireflies_id,url`,
    "GET"
  )) as Array<{ id: string; fireflies_id: string; url: string }>;

  return result && result.length > 0 ? result[0] : null;
}
