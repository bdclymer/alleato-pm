/**
 * Workspace Artifact Service
 *
 * CRUD + semantic search layer for the `workspace_artifacts` table.
 * Artifacts are work-in-progress documents (owner updates, risk reports,
 * meeting prep, analyses, briefings, notes) co-created between the user
 * and the AI assistant across sessions.
 *
 * Key design decisions:
 *   - Embedding failure is non-fatal: artifacts are saved without vectors
 *     and fall back to recency-ordered list queries instead of semantic search.
 *   - Embedding reuses embed() from ai-memory-service to ensure consistent
 *     model (text-embedding-3-large at 3072 dims) and AI Gateway routing.
 *   - All mutations are user-scoped (user_id filter on every write) as a
 *     belt-and-suspenders guard on top of RLS.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { embed } from "@/lib/ai/services/ai-memory-service";
import type { Database, Json } from "@/types/database.types";

type WorkspaceArtifactInsert =
  Database["public"]["Tables"]["workspace_artifacts"]["Insert"];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ArtifactType =
  | "owner_update"
  | "risk_report"
  | "meeting_prep"
  | "analysis"
  | "briefing"
  | "note";

export type ArtifactStatus = "draft" | "final" | "archived" | "promoted";

export type PromoteTarget = "ai_memories" | "progress_report" | "initiative";

export interface WorkspaceArtifact {
  id: string;
  user_id: string;
  project_id: number | null;
  artifact_type: ArtifactType;
  title: string;
  status: ArtifactStatus;
  version: number;
  content: Record<string, unknown>;
  context_snapshot: Record<string, unknown>;
  session_id: string | null;
  promoted_to: PromoteTarget | null;
  promoted_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  similarity?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns "just now", "Xm ago", "Xh ago", or "Xd ago" */
export function timeSince(isoString: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(isoString).getTime());
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

/** Extracts a short preview string from artifact content */
export function extractPreview(content: Record<string, unknown>): string {
  const keys = ["summary", "body", "text", "notes", "description"] as const;
  for (const key of keys) {
    const val = content[key];
    if (typeof val === "string" && val.trim().length > 0) {
      return val.substring(0, 120);
    }
  }
  // Fallback: stringify any first string value found
  for (const val of Object.values(content)) {
    if (typeof val === "string" && val.trim().length > 0) {
      return val.substring(0, 120);
    }
  }
  return "";
}


// The SELECT columns used everywhere — omits the large embedding vector.
const SELECT_COLS =
  "id, user_id, project_id, artifact_type, title, status, version, content, context_snapshot, session_id, promoted_to, promoted_at, tags, created_at, updated_at";

// ---------------------------------------------------------------------------
// createArtifact
// ---------------------------------------------------------------------------

export interface CreateArtifactParams {
  userId: string;
  artifactType: ArtifactType;
  title: string;
  content: Record<string, unknown>;
  projectId?: number | null;
  contextSnapshot?: Record<string, unknown>;
  sessionId?: string | null;
  tags?: string[];
  status?: ArtifactStatus;
}

export async function createArtifact(
  params: CreateArtifactParams,
): Promise<{ id: string } | { error: string }> {
  const supabase = createServiceClient();

  // DO NOT write embedding to workspace_artifacts in PM APP.
  // HNSW index on this column causes OOM under concurrent inserts (same pattern
  // as document_metadata.summary_embedding and ai_memories.embedding crashes).
  const row: WorkspaceArtifactInsert = {
    user_id: params.userId,
    artifact_type: params.artifactType,
    title: params.title,
    content: params.content as Json,
    project_id: params.projectId ?? null,
    context_snapshot: (params.contextSnapshot ?? {}) as Json,
    session_id: params.sessionId ?? null,
    tags: params.tags ?? [],
    status: params.status ?? "draft",
  };

  const { data, error } = await supabase
    .from("workspace_artifacts")
    .insert(row)
    .select("id")
    .single();

  if (error) return { error: `Artifact create failed: ${error.message}` };
  return { id: data.id };
}

// ---------------------------------------------------------------------------
// updateArtifact
// ---------------------------------------------------------------------------

export interface UpdateArtifactParams {
  title?: string;
  content?: Record<string, unknown>;
  status?: ArtifactStatus;
  contextSnapshot?: Record<string, unknown>;
  sessionId?: string | null;
  tags?: string[];
}

export async function updateArtifact(
  id: string,
  userId: string,
  params: UpdateArtifactParams,
): Promise<{ id: string; version: number } | { error: string }> {
  const supabase = createServiceClient();

  // Fetch current record to get current version and type for re-embedding
  const { data: current, error: fetchError } = await supabase
    .from("workspace_artifacts")
    .select("version, artifact_type, title, content")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !current) {
    return { error: `Artifact fetch failed: ${fetchError?.message ?? "not found"}` };
  }

  if (typeof current.version !== "number") {
    return { error: "Artifact record has unexpected shape — version is not a number" };
  }

  const newVersion = current.version + 1;
  const updates: Record<string, unknown> = { version: newVersion };

  if (params.title !== undefined) updates.title = params.title;
  if (params.content !== undefined) updates.content = params.content;
  if (params.status !== undefined) updates.status = params.status;
  if (params.contextSnapshot !== undefined) updates.context_snapshot = params.contextSnapshot;
  if (params.sessionId !== undefined) updates.session_id = params.sessionId;
  if (params.tags !== undefined) updates.tags = params.tags;

  // No re-embedding on update — embedding column is blocked in PM APP (OOM fix).

  const { error: updateError } = await supabase
    .from("workspace_artifacts")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId);

  if (updateError) return { error: `Artifact update failed: ${updateError.message}` };
  return { id, version: newVersion };
}

// ---------------------------------------------------------------------------
// getArtifact
// ---------------------------------------------------------------------------

export async function getArtifact(
  id: string,
  userId: string,
): Promise<WorkspaceArtifact | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("workspace_artifacts")
    .select(SELECT_COLS)
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("[workspace-artifact-service] getArtifact failed:", error.message);
    return null;  // still return null (callers check for null), but log the error
  }
  if (!data) return null;
  return data as unknown as WorkspaceArtifact;
}

// ---------------------------------------------------------------------------
// listArtifacts
// ---------------------------------------------------------------------------

export interface ListArtifactsParams {
  userId: string;
  projectId?: number | null;
  artifactType?: ArtifactType;
  status?: ArtifactStatus;
  limit?: number;
}

export async function listArtifacts(params: ListArtifactsParams): Promise<WorkspaceArtifact[]> {
  const supabase = createServiceClient();

  try {
    let query = supabase
      .from("workspace_artifacts")
      .select(SELECT_COLS)
      .eq("user_id", params.userId)
      .order("updated_at", { ascending: false });

    if (params.projectId !== undefined && params.projectId !== null) {
      query = query.eq("project_id", params.projectId);
    }
    if (params.artifactType !== undefined) {
      query = query.eq("artifact_type", params.artifactType);
    }
    if (params.status !== undefined) {
      query = query.eq("status", params.status);
    }
    if (params.limit !== undefined) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[workspace-artifact-service] listArtifacts error:", error.message);
      return [];
    }
    return (data ?? []) as unknown as WorkspaceArtifact[];
  } catch (e) {
    console.error(
      "[workspace-artifact-service] listArtifacts threw:",
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// searchArtifacts
// ---------------------------------------------------------------------------

export interface SearchArtifactsParams {
  userId: string;
  query: string;
  projectId?: number | null;
  status?: ArtifactStatus;
  matchCount?: number;
  matchThreshold?: number;
}

export async function searchArtifacts(params: SearchArtifactsParams): Promise<WorkspaceArtifact[]> {
  const supabase = createServiceClient();

  let embeddingVec: number[];
  try {
    embeddingVec = await embed(params.query);
  } catch (e) {
    console.warn(
      "[workspace-artifact-service] Embed failed for search — falling back to listArtifacts:",
      e instanceof Error ? e.message : e,
    );
    return listArtifacts({
      userId: params.userId,
      projectId: params.projectId ?? undefined,
      status: params.status,
      limit: params.matchCount ?? 10,
    });
  }

  const { data, error } = await supabase.rpc("search_workspace_artifacts", {
    query_embedding: JSON.stringify(embeddingVec),
    p_user_id: params.userId,
    p_project_id: params.projectId ?? undefined,
    p_status: params.status ?? undefined,
    match_count: params.matchCount ?? 10,
    match_threshold: params.matchThreshold ?? 0.45,
  });

  if (error) {
    console.error(
      "[workspace-artifact-service] searchArtifacts RPC error — falling back to list:",
      error.message,
    );
    return listArtifacts({
      userId: params.userId,
      projectId: params.projectId ?? undefined,
      status: params.status,
      limit: params.matchCount ?? 10,
    });
  }

  return (data ?? []) as unknown as WorkspaceArtifact[];
}

// ---------------------------------------------------------------------------
// promoteArtifact
// ---------------------------------------------------------------------------

export async function promoteArtifact(
  id: string,
  userId: string,
  target: PromoteTarget,
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("workspace_artifacts")
    .update({
      status: "promoted",
      promoted_to: target,
      promoted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { error: `Artifact promote failed: ${error.message}` };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// archiveArtifact
// ---------------------------------------------------------------------------

export async function archiveArtifact(
  id: string,
  userId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("workspace_artifacts")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { error: `Artifact archive failed: ${error.message}` };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// buildWorkspaceContextBlock
// ---------------------------------------------------------------------------

/**
 * Builds a Markdown block listing active (draft|final) workspace artifacts
 * for injection into the AI system prompt. Returns empty string if none.
 */
export function buildWorkspaceContextBlock(artifacts: WorkspaceArtifact[]): string {
  const active = artifacts.filter(
    (a) => a.status === "draft" || a.status === "final",
  );

  if (active.length === 0) return "";

  const lines: string[] = [
    "## Active Workspace Drafts",
    "",
    `The user has ${active.length} work-in-progress artifact(s):`,
    "",
  ];

  const MAX_CHARS = 2_400;
  let remaining = MAX_CHARS;
  for (const a of active) {
    if (remaining <= 0) break;
    const preview = extractPreview(a.content);
    const entry =
      `- **${a.title}** (${a.artifact_type}, ${a.status}, v${a.version}, last edited ${timeSince(a.updated_at)})\n` +
      `  ID: \`${a.id}\`\n` +
      (preview ? `  Preview: ${preview}\n` : "");
    lines.push(entry);
    remaining -= entry.length;
  }

  lines.push(
    "Use `getDraftArtifact` to load the full content of any of these before working on it. Use `saveWorkspaceArtifact` to update drafts as you build them together.",
  );

  return lines.join("\n");
}
