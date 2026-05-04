# Workspace Artifacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a working-memory / scratchpad layer to the AI assistant so that work-in-progress drafts (owner updates, risk reports, meeting prep, analyses) persist across sessions and can be retrieved by natural language.

**Architecture:** A `workspace_artifacts` table stores versioned drafts keyed by `user_id + project_id + artifact_type`, with a `halfvec(3072)` embedding for semantic retrieval. A service layer wraps reads/writes. Four AI tools expose the layer to the assistant. `assembleSystemPrompt()` in `bot-core.ts` loads active drafts for the current project and injects them as a context block so the AI knows what work is in progress on the very first message.

**Tech Stack:** Supabase (PostgreSQL + pgvector halfvec), OpenAI `text-embedding-3-large` (3072 dims, reusing the existing `embed()` function), Vercel AI SDK `tool()`, Next.js App Router API routes, `withApiGuardrails` + `createServiceClient()` patterns already in the codebase.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260503210000_workspace_artifacts.sql` | Table DDL + RLS + indexes |
| Create | `frontend/src/lib/ai/services/workspace-artifact-service.ts` | CRUD + semantic search + promote/archive |
| Create | `frontend/src/lib/ai/tools/workspace-tools.ts` | Four AI tools wrapping the service |
| Modify | `frontend/src/lib/ai/orchestrator.ts` | Spread workspace tools into `createStrategistTools()` |
| Modify | `frontend/src/lib/ai/bot-core.ts` | Load active drafts in `assembleSystemPrompt()`, inject context block |
| Create | `frontend/src/app/api/ai-assistant/workspace/route.ts` | `GET` (list) + `POST` (create) |
| Create | `frontend/src/app/api/ai-assistant/workspace/[artifactId]/route.ts` | `GET` + `PATCH` + `DELETE` |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260503210000_workspace_artifacts.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260503210000_workspace_artifacts.sql

CREATE TABLE public.workspace_artifacts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id      INTEGER     REFERENCES public.projects(id) ON DELETE SET NULL,
  artifact_type   TEXT        NOT NULL,  -- owner_update | risk_report | meeting_prep | analysis | briefing | note
  title           TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'draft',  -- draft | final | archived | promoted
  version         INTEGER     NOT NULL DEFAULT 1,
  content         JSONB       NOT NULL DEFAULT '{}',
  context_snapshot JSONB      NOT NULL DEFAULT '{}',
  session_id      TEXT,
  promoted_to     TEXT,        -- ai_memories | progress_report | initiative | null
  promoted_at     TIMESTAMPTZ,
  embedding       HALFVEC(3072),
  tags            TEXT[]      NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workspace_artifacts_user_id   ON public.workspace_artifacts(user_id);
CREATE INDEX idx_workspace_artifacts_project   ON public.workspace_artifacts(project_id);
CREATE INDEX idx_workspace_artifacts_status    ON public.workspace_artifacts(status);
CREATE INDEX idx_workspace_artifacts_type      ON public.workspace_artifacts(artifact_type);
CREATE INDEX idx_workspace_artifacts_updated   ON public.workspace_artifacts(updated_at DESC);

-- Vector index for semantic retrieval (cosine distance on halfvec)
CREATE INDEX idx_workspace_artifacts_embedding
  ON public.workspace_artifacts USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_workspace_artifact_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workspace_artifacts_updated_at
  BEFORE UPDATE ON public.workspace_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.set_workspace_artifact_updated_at();

-- RLS
ALTER TABLE public.workspace_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own artifacts"
  ON public.workspace_artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own artifacts"
  ON public.workspace_artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own artifacts"
  ON public.workspace_artifacts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own artifacts"
  ON public.workspace_artifacts FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass (used by server-side AI tools)
CREATE POLICY "Service role full access"
  ON public.workspace_artifacts FOR ALL
  USING (auth.role() = 'service_role');

-- Semantic search function (cosine similarity, returns top N for a user)
CREATE OR REPLACE FUNCTION public.search_workspace_artifacts(
  query_embedding  HALFVEC(3072),
  p_user_id        UUID,
  p_project_id     INTEGER DEFAULT NULL,
  p_status         TEXT    DEFAULT NULL,
  match_count      INTEGER DEFAULT 5,
  match_threshold  FLOAT   DEFAULT 0.35
)
RETURNS TABLE (
  id              UUID,
  artifact_type   TEXT,
  title           TEXT,
  status          TEXT,
  version         INTEGER,
  content         JSONB,
  context_snapshot JSONB,
  session_id      TEXT,
  promoted_to     TEXT,
  tags            TEXT[],
  updated_at      TIMESTAMPTZ,
  similarity      FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    wa.id,
    wa.artifact_type,
    wa.title,
    wa.status,
    wa.version,
    wa.content,
    wa.context_snapshot,
    wa.session_id,
    wa.promoted_to,
    wa.tags,
    wa.updated_at,
    1 - (wa.embedding <=> query_embedding) AS similarity
  FROM public.workspace_artifacts wa
  WHERE
    wa.user_id = p_user_id
    AND (p_project_id IS NULL OR wa.project_id = p_project_id)
    AND (p_status IS NULL OR wa.status = p_status)
    AND wa.embedding IS NOT NULL
    AND 1 - (wa.embedding <=> query_embedding) >= match_threshold
  ORDER BY wa.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

- [ ] **Step 2: Apply the migration**

```bash
cd /Users/meganharrison/Documents/alleato-pm
npx supabase db push --local 2>/dev/null || npx supabase migration up
```

If using the Supabase MCP, apply via `mcp__d852572d__apply_migration` with the SQL above.

- [ ] **Step 3: Verify the table exists**

```bash
npx supabase db execute --local "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workspace_artifacts' ORDER BY ordinal_position;"
```

Expected: rows for id, user_id, project_id, artifact_type, title, status, version, content, context_snapshot, session_id, promoted_to, promoted_at, embedding, tags, created_at, updated_at.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260503210000_workspace_artifacts.sql
git commit -m "feat(db): add workspace_artifacts table with RLS and semantic search"
```

---

## Task 2: Service Layer

**Files:**
- Create: `frontend/src/lib/ai/services/workspace-artifact-service.ts`

- [ ] **Step 1: Create the service file**

```typescript
// frontend/src/lib/ai/services/workspace-artifact-service.ts
import { createServiceClient } from "@/lib/supabase/service";
import { embed } from "@/lib/ai/services/ai-memory-service";

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

export interface CreateArtifactParams {
  userId: string;
  projectId?: number | null;
  artifactType: ArtifactType;
  title: string;
  content: Record<string, unknown>;
  contextSnapshot?: Record<string, unknown>;
  sessionId?: string;
  tags?: string[];
}

export interface UpdateArtifactParams {
  content?: Record<string, unknown>;
  title?: string;
  status?: ArtifactStatus;
  contextSnapshot?: Record<string, unknown>;
  sessionId?: string;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createArtifact(
  params: CreateArtifactParams,
): Promise<{ id: string } | { error: string }> {
  const supabase = createServiceClient();

  const embeddingText = `${params.artifactType}: ${params.title}\n${JSON.stringify(params.content).substring(0, 4000)}`;
  let embedding: number[] | null = null;
  try {
    embedding = await embed(embeddingText);
  } catch {
    // Non-fatal: save without embedding; search falls back to list
  }

  const { data, error } = await supabase
    .from("workspace_artifacts")
    .insert({
      user_id: params.userId,
      project_id: params.projectId ?? null,
      artifact_type: params.artifactType,
      title: params.title,
      content: params.content,
      context_snapshot: params.contextSnapshot ?? {},
      session_id: params.sessionId ?? null,
      tags: params.tags ?? [],
      embedding: embedding ? JSON.stringify(embedding) : null,
    })
    .select("id")
    .single();

  if (error) return { error: `Failed to create artifact: ${error.message}` };
  return { id: data.id };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateArtifact(
  id: string,
  userId: string,
  params: UpdateArtifactParams,
): Promise<{ id: string; version: number } | { error: string }> {
  const supabase = createServiceClient();

  // Fetch current record to increment version
  const { data: current, error: fetchError } = await supabase
    .from("workspace_artifacts")
    .select("version, title, content, artifact_type")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !current) {
    return { error: `Artifact ${id} not found or not owned by user` };
  }

  const newVersion = current.version + 1;
  const newContent = params.content ?? (current.content as Record<string, unknown>);
  const newTitle = params.title ?? (current.title as string);

  // Re-embed if content or title changed
  let embedding: string | null = null;
  if (params.content !== undefined || params.title !== undefined) {
    try {
      const embeddingText = `${current.artifact_type}: ${newTitle}\n${JSON.stringify(newContent).substring(0, 4000)}`;
      const vec = await embed(embeddingText);
      embedding = JSON.stringify(vec);
    } catch {
      // Non-fatal
    }
  }

  const updatePayload: Record<string, unknown> = {
    version: newVersion,
    ...(params.content !== undefined && { content: newContent }),
    ...(params.title !== undefined && { title: newTitle }),
    ...(params.status !== undefined && { status: params.status }),
    ...(params.contextSnapshot !== undefined && { context_snapshot: params.contextSnapshot }),
    ...(params.sessionId !== undefined && { session_id: params.sessionId }),
    ...(params.tags !== undefined && { tags: params.tags }),
    ...(embedding !== null && { embedding }),
  };

  const { error } = await supabase
    .from("workspace_artifacts")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { error: `Failed to update artifact: ${error.message}` };
  return { id, version: newVersion };
}

// ---------------------------------------------------------------------------
// Get
// ---------------------------------------------------------------------------

export async function getArtifact(
  id: string,
  userId: string,
): Promise<WorkspaceArtifact | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workspace_artifacts")
    .select("id, user_id, project_id, artifact_type, title, status, version, content, context_snapshot, session_id, promoted_to, promoted_at, tags, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as WorkspaceArtifact;
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function listArtifacts(params: {
  userId: string;
  projectId?: number | null;
  artifactType?: ArtifactType;
  status?: ArtifactStatus;
  limit?: number;
}): Promise<WorkspaceArtifact[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("workspace_artifacts")
    .select("id, user_id, project_id, artifact_type, title, status, version, content, context_snapshot, session_id, promoted_to, promoted_at, tags, created_at, updated_at")
    .eq("user_id", params.userId)
    .order("updated_at", { ascending: false })
    .limit(params.limit ?? 20);

  if (params.projectId !== undefined && params.projectId !== null) {
    query = query.eq("project_id", params.projectId);
  }
  if (params.artifactType) {
    query = query.eq("artifact_type", params.artifactType);
  }
  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[workspace-artifact-service] listArtifacts failed:", error.message);
    return [];
  }
  return (data ?? []) as WorkspaceArtifact[];
}

// ---------------------------------------------------------------------------
// Semantic search
// ---------------------------------------------------------------------------

export async function searchArtifacts(params: {
  userId: string;
  query: string;
  projectId?: number | null;
  status?: ArtifactStatus;
  matchCount?: number;
  matchThreshold?: number;
}): Promise<WorkspaceArtifact[]> {
  const supabase = createServiceClient();

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embed(params.query);
  } catch {
    // Fallback to list-based search if embedding fails
    return listArtifacts({ userId: params.userId, projectId: params.projectId, status: params.status, limit: params.matchCount ?? 5 });
  }

  const { data, error } = await supabase.rpc("search_workspace_artifacts", {
    query_embedding: JSON.stringify(queryEmbedding),
    p_user_id: params.userId,
    p_project_id: params.projectId ?? null,
    p_status: params.status ?? null,
    match_count: params.matchCount ?? 5,
    match_threshold: params.matchThreshold ?? 0.35,
  });

  if (error) {
    console.error("[workspace-artifact-service] searchArtifacts RPC failed:", error.message);
    return [];
  }
  return (data ?? []) as WorkspaceArtifact[];
}

// ---------------------------------------------------------------------------
// Promote
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

  if (error) return { error: `Failed to promote artifact: ${error.message}` };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Archive
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

  if (error) return { error: `Failed to archive artifact: ${error.message}` };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Context block for prompt injection
// ---------------------------------------------------------------------------

/**
 * Builds a Markdown context block listing active (draft/final) artifacts
 * for the current user+project. Injected into the system prompt at the
 * start of every conversation.
 */
export function buildWorkspaceContextBlock(artifacts: WorkspaceArtifact[]): string {
  const active = artifacts.filter((a) => a.status === "draft" || a.status === "final");
  if (active.length === 0) return "";

  const lines = active.map((a) => {
    const age = timeSince(a.updated_at);
    const contentPreview = extractPreview(a.content);
    return (
      `- **${a.title}** (${a.artifact_type}, ${a.status}, v${a.version}, last edited ${age})\n` +
      `  ID: \`${a.id}\`\n` +
      (contentPreview ? `  Preview: ${contentPreview}\n` : "")
    );
  });

  return (
    `## Active Workspace Drafts\n\n` +
    `The user has ${active.length} work-in-progress artifact${active.length > 1 ? "s" : ""}:\n\n` +
    lines.join("\n") +
    `\nUse \`getDraftArtifact\` to load the full content of any of these before working on it. ` +
    `Use \`saveWorkspaceArtifact\` to update drafts as you build them together.`
  );
}

function timeSince(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function extractPreview(content: Record<string, unknown>): string {
  // Try common content keys; fall back to first string value
  for (const key of ["summary", "body", "text", "notes", "description"]) {
    const val = content[key];
    if (typeof val === "string" && val.length > 0) {
      return val.substring(0, 120) + (val.length > 120 ? "…" : "");
    }
  }
  const firstString = Object.values(content).find((v) => typeof v === "string" && (v as string).length > 0);
  if (firstString) return (firstString as string).substring(0, 120) + ((firstString as string).length > 120 ? "…" : "");
  return "";
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit 2>&1 | grep workspace-artifact-service
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/ai/services/workspace-artifact-service.ts
git commit -m "feat(ai): add workspace-artifact-service with CRUD, semantic search, and prompt injection"
```

---

## Task 3: AI Tools

**Files:**
- Create: `frontend/src/lib/ai/tools/workspace-tools.ts`

- [ ] **Step 1: Create the tools file**

```typescript
// frontend/src/lib/ai/tools/workspace-tools.ts
import { tool } from "ai";
import { z } from "zod";
import {
  createArtifact,
  updateArtifact,
  getArtifact,
  listArtifacts,
  searchArtifacts,
  promoteArtifact,
  archiveArtifact,
  type ArtifactType,
  type ArtifactStatus,
  type PromoteTarget,
} from "@/lib/ai/services/workspace-artifact-service";
import { type ToolTracePayload, withTrace as _withTrace } from "./tool-utils";

type WorkspaceToolOptions = {
  onTrace?: (trace: ToolTracePayload) => void;
};

function withTrace<TInput extends Record<string, unknown>, TResult>(
  name: string,
  options: WorkspaceToolOptions,
  execute: (input: TInput) => Promise<TResult>,
) {
  return _withTrace(
    name,
    options,
    execute,
    "The workspace tool failed. You can continue without draft context.",
  );
}

export function createWorkspaceTools(userId: string, options: WorkspaceToolOptions = {}) {
  return {
    // -------------------------------------------------------------------------
    // 1. List workspace artifacts
    // -------------------------------------------------------------------------
    listWorkspaceArtifacts: tool({
      description:
        "List the user's work-in-progress drafts and saved workspace artifacts. " +
        "Use this at the start of a work session to see what's already been started. " +
        "Returns titles, types, status, last-edited time, and IDs. " +
        "Filter by project or type to narrow results.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Filter to a specific project"),
        artifactType: z
          .enum(["owner_update", "risk_report", "meeting_prep", "analysis", "briefing", "note"])
          .optional()
          .describe("Filter by artifact type"),
        status: z
          .enum(["draft", "final", "archived", "promoted"])
          .optional()
          .describe("Filter by status. Defaults to all active (draft + final) if omitted."),
        limit: z.number().min(1).max(50).optional().describe("Max results (default 10)"),
      }),
      execute: withTrace("listWorkspaceArtifacts", options, async ({ projectId, artifactType, status, limit }) => {
        const artifacts = await listArtifacts({
          userId,
          projectId: projectId ?? null,
          artifactType: artifactType as ArtifactType | undefined,
          status: status as ArtifactStatus | undefined,
          limit: limit ?? 10,
        });

        if (artifacts.length === 0) {
          return { artifacts: [], message: "No workspace artifacts found for the given filters." };
        }

        return {
          artifacts: artifacts.map((a) => ({
            id: a.id,
            type: a.artifact_type,
            title: a.title,
            status: a.status,
            version: a.version,
            projectId: a.project_id,
            tags: a.tags,
            lastEdited: a.updated_at,
          })),
          count: artifacts.length,
        };
      }),
    }),

    // -------------------------------------------------------------------------
    // 2. Get a specific draft (by ID or natural language search)
    // -------------------------------------------------------------------------
    getDraftArtifact: tool({
      description:
        "Retrieve the full content of a workspace draft. " +
        "Use `artifactId` if you know the exact ID (e.g. from listWorkspaceArtifacts). " +
        "Use `searchQuery` to find a draft by natural language (e.g. 'the owner update we started for Ulta Fresno'). " +
        "Always call this before editing an existing draft so you have the current content.",
      inputSchema: z.object({
        artifactId: z.string().uuid().optional().describe("Exact artifact ID"),
        searchQuery: z
          .string()
          .optional()
          .describe("Natural language description of the draft to find"),
        projectId: z.number().optional().describe("Narrow search to a project"),
      }),
      execute: withTrace("getDraftArtifact", options, async ({ artifactId, searchQuery, projectId }) => {
        if (artifactId) {
          const artifact = await getArtifact(artifactId, userId);
          if (!artifact) return { error: `Artifact ${artifactId} not found.` };
          return { artifact };
        }

        if (searchQuery) {
          const results = await searchArtifacts({
            userId,
            query: searchQuery,
            projectId: projectId ?? null,
            matchCount: 3,
          });
          if (results.length === 0) {
            return { error: `No artifact found matching: "${searchQuery}"` };
          }
          return { artifact: results[0], alternatives: results.slice(1).map((a) => ({ id: a.id, title: a.title, type: a.artifact_type })) };
        }

        return { error: "Provide either artifactId or searchQuery." };
      }),
    }),

    // -------------------------------------------------------------------------
    // 3. Save (create or update) a workspace artifact
    // -------------------------------------------------------------------------
    saveWorkspaceArtifact: tool({
      description:
        "Save a work-in-progress draft to the workspace. " +
        "If `artifactId` is provided, updates that existing artifact. " +
        "If omitted, creates a new artifact. " +
        "Use this whenever you assemble or update an owner update, risk report, meeting prep doc, " +
        "analysis, briefing, or note that the user may want to return to. " +
        "Always save drafts before ending a session about multi-part work.",
      inputSchema: z.object({
        artifactId: z.string().uuid().optional().describe("ID of existing artifact to update. Omit to create new."),
        artifactType: z
          .enum(["owner_update", "risk_report", "meeting_prep", "analysis", "briefing", "note"])
          .describe("Type of work product"),
        title: z.string().describe("Descriptive title, e.g. 'Owner Update — Ulta Fresno Q2 2026'"),
        content: z
          .record(z.unknown())
          .describe(
            "The artifact content as a JSON object. Structure depends on type. " +
              "For owner_update: { summary, completed_this_period, upcoming, risks, photos_needed }. " +
              "For risk_report: { risks: [{title, description, severity, mitigation}] }. " +
              "For meeting_prep: { agenda, key_questions, data_to_pull, attendees }. " +
              "For analysis: { findings, recommendations, data_sources }. " +
              "For briefing: { sections: [{heading, content}] }. " +
              "For note: { body }.",
          ),
        projectId: z.number().optional().describe("Project this artifact belongs to"),
        status: z
          .enum(["draft", "final"])
          .optional()
          .default("draft")
          .describe("Set to 'final' when the document is complete"),
        contextSnapshot: z
          .record(z.unknown())
          .optional()
          .describe("Snapshot of project state at save time (budget total, open RFIs, etc.)"),
        tags: z.array(z.string()).optional().describe("Optional tags for filtering"),
        sessionId: z.string().optional().describe("Current session ID"),
      }),
      execute: withTrace("saveWorkspaceArtifact", options, async (input) => {
        if (input.artifactId) {
          const result = await updateArtifact(input.artifactId, userId, {
            content: input.content as Record<string, unknown>,
            title: input.title,
            status: input.status as ArtifactStatus,
            contextSnapshot: input.contextSnapshot as Record<string, unknown> | undefined,
            tags: input.tags,
            sessionId: input.sessionId,
          });

          if ("error" in result) return { error: result.error };
          return { saved: true, artifactId: result.id, version: result.version, action: "updated" };
        }

        const result = await createArtifact({
          userId,
          projectId: input.projectId ?? null,
          artifactType: input.artifactType as ArtifactType,
          title: input.title,
          content: input.content as Record<string, unknown>,
          contextSnapshot: input.contextSnapshot as Record<string, unknown> | undefined,
          tags: input.tags,
          sessionId: input.sessionId,
        });

        if ("error" in result) return { error: result.error };
        return { saved: true, artifactId: result.id, version: 1, action: "created" };
      }),
    }),

    // -------------------------------------------------------------------------
    // 4. Promote or archive an artifact
    // -------------------------------------------------------------------------
    promoteWorkspaceArtifact: tool({
      description:
        "Promote a finalized workspace artifact to a more permanent destination, or archive a draft that's no longer needed. " +
        "Promote targets: " +
        "'ai_memories' — extracts key facts into long-term memory; " +
        "'progress_report' — marks as source for a progress report; " +
        "'initiative' — flags as an initiative card to create. " +
        "Archive: use action='archive' to mark a draft as no longer active.",
      inputSchema: z.object({
        artifactId: z.string().uuid().describe("ID of the artifact to promote or archive"),
        action: z.enum(["promote", "archive"]).describe("'promote' to advance to a destination, 'archive' to retire"),
        promoteTo: z
          .enum(["ai_memories", "progress_report", "initiative"])
          .optional()
          .describe("Required when action is 'promote'"),
      }),
      execute: withTrace("promoteWorkspaceArtifact", options, async ({ artifactId, action, promoteTo }) => {
        if (action === "archive") {
          const result = await archiveArtifact(artifactId, userId);
          if ("error" in result) return { error: result.error };
          return { ok: true, action: "archived", artifactId };
        }

        if (action === "promote") {
          if (!promoteTo) return { error: "promoteTo is required when action is 'promote'" };
          const result = await promoteArtifact(artifactId, userId, promoteTo as PromoteTarget);
          if ("error" in result) return { error: result.error };
          return { ok: true, action: "promoted", artifactId, promotedTo: promoteTo };
        }

        return { error: `Unknown action: ${action}` };
      }),
    }),
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit 2>&1 | grep workspace-tools
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/ai/tools/workspace-tools.ts
git commit -m "feat(ai): add workspace AI tools (list, get, save, promote)"
```

---

## Task 4: Wire Tools into the Orchestrator

**Files:**
- Modify: `frontend/src/lib/ai/orchestrator.ts`

- [ ] **Step 1: Add the import** at the top of `orchestrator.ts`, after the existing tool imports (around line 40):

```typescript
import {
  createWorkspaceTools,
} from "@/lib/ai/tools/workspace-tools";
```

- [ ] **Step 2: Spread workspace tools into `createStrategistTools()`**

Find the `return {` block in `createStrategistTools()` (around line 746) and add `...workspaceTools` to the spread. First add the variable before the return:

```typescript
export function createStrategistTools(
  userId: string,
  options: {
    onTrace?: (trace: Record<string, unknown>) => void;
    pinnedProjectId?: number;
  } = {},
) {
  // ... existing code ...
  const workspaceTools = createWorkspaceTools(userId, { onTrace: options.onTrace });

  return {
    ...webSearchTools,
    ...structuredOutputTools,
    ...actionTools,
    ...progressReportTools,
    ...workspaceTools,          // ← ADD THIS LINE
    consultCFO: makeConsultTool(/* ... */),
    // ... rest of return unchanged
  };
}
```

Also update the `StrategistToolOptions` type at the top of the file (around line 58) to include workspace tool options — but since `createWorkspaceTools` only takes `userId` and `onTrace`, no type change is actually needed. The existing `StrategistToolOptions` is a union of existing factory option types; workspace tools use a subset of those already.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit 2>&1 | grep -E "orchestrator|workspace"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/ai/orchestrator.ts
git commit -m "feat(ai): wire workspace tools into createStrategistTools"
```

---

## Task 5: Inject Active Drafts into System Prompt

**Files:**
- Modify: `frontend/src/lib/ai/bot-core.ts`

- [ ] **Step 1: Add the import** at the top of `bot-core.ts`, after the other service imports (around line 26):

```typescript
import {
  listArtifacts,
  buildWorkspaceContextBlock,
} from "@/lib/ai/services/workspace-artifact-service";
```

- [ ] **Step 2: Load active drafts in `assembleSystemPrompt()`**

Inside the `assembleSystemPrompt()` function, find the `Promise.all` call that loads memories and summaries (around line 116). Extend it to also load workspace artifacts in parallel:

```typescript
const [
  { preferences, relevant, team, errors: memoryErrors },
  recentSummaries,
  activeArtifacts,
] = await Promise.all([
  getMemoriesForSession({ userId, firstMessage: messageText }),
  isFirstTurn && sessionId
    ? getRecentConversationSummaries(userId, sessionId, 3)
    : Promise.resolve([]),
  isFirstTurn
    ? listArtifacts({
        userId,
        projectId: selectedProjectId ?? null,
        status: "draft",
        limit: 5,
      }).catch(() => [])
    : Promise.resolve([]),
]);
```

Then build the workspace block and include it in `contextParts`:

```typescript
const workspaceBlock = buildWorkspaceContextBlock(activeArtifacts);

const contextParts = [recentBlock, memoryBlock, learningBlock, workspaceBlock].filter(Boolean);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit 2>&1 | grep bot-core
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/ai/bot-core.ts
git commit -m "feat(ai): inject active workspace drafts into system prompt context"
```

---

## Task 6: API Routes

**Files:**
- Create: `frontend/src/app/api/ai-assistant/workspace/route.ts`
- Create: `frontend/src/app/api/ai-assistant/workspace/[artifactId]/route.ts`

- [ ] **Step 1: Create the collection route**

```typescript
// frontend/src/app/api/ai-assistant/workspace/route.ts
export const dynamic = "force-dynamic";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import {
  createArtifact,
  listArtifacts,
  type ArtifactType,
  type ArtifactStatus,
} from "@/lib/ai/services/workspace-artifact-service";

/** GET /api/ai-assistant/workspace — list the current user's artifacts */
export const GET = withApiGuardrails(
  "ai-assistant/workspace#GET",
  async ({ request }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "ai-assistant/workspace#GET",
        message: "Authentication required.",
      });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") ? Number(searchParams.get("projectId")) : undefined;
    const artifactType = searchParams.get("type") as ArtifactType | null;
    const status = searchParams.get("status") as ArtifactStatus | null;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

    const artifacts = await listArtifacts({
      userId: user.id,
      projectId: projectId ?? null,
      artifactType: artifactType ?? undefined,
      status: status ?? undefined,
      limit,
    });

    return Response.json({ artifacts });
  },
);

/** POST /api/ai-assistant/workspace — create a new artifact */
export const POST = withApiGuardrails(
  "ai-assistant/workspace#POST",
  async ({ request }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "ai-assistant/workspace#POST",
        message: "Authentication required.",
      });
    }

    const body = await request.json() as {
      artifactType: ArtifactType;
      title: string;
      content: Record<string, unknown>;
      projectId?: number;
      contextSnapshot?: Record<string, unknown>;
      sessionId?: string;
      tags?: string[];
    };

    if (!body.artifactType || !body.title || !body.content) {
      throw new GuardrailError({
        code: "VALIDATION_ERROR",
        where: "ai-assistant/workspace#POST",
        message: "artifactType, title, and content are required.",
      });
    }

    const result = await createArtifact({
      userId: user.id,
      projectId: body.projectId ?? null,
      artifactType: body.artifactType,
      title: body.title,
      content: body.content,
      contextSnapshot: body.contextSnapshot,
      sessionId: body.sessionId,
      tags: body.tags,
    });

    if ("error" in result) {
      throw new GuardrailError({
        code: "DB_ERROR",
        where: "ai-assistant/workspace#POST",
        message: result.error,
      });
    }

    return Response.json({ id: result.id }, { status: 201 });
  },
);
```

- [ ] **Step 2: Create the item route**

```typescript
// frontend/src/app/api/ai-assistant/workspace/[artifactId]/route.ts
export const dynamic = "force-dynamic";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import {
  getArtifact,
  updateArtifact,
  archiveArtifact,
  promoteArtifact,
  type ArtifactStatus,
  type PromoteTarget,
} from "@/lib/ai/services/workspace-artifact-service";

/** GET /api/ai-assistant/workspace/[artifactId] */
export const GET = withApiGuardrails(
  "ai-assistant/workspace/[artifactId]#GET",
  async ({ params }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "ai-assistant/workspace/[artifactId]#GET",
        message: "Authentication required.",
      });
    }

    const { artifactId } = await params;
    const artifact = await getArtifact(artifactId, user.id);

    if (!artifact) {
      throw new GuardrailError({
        code: "NOT_FOUND",
        where: "ai-assistant/workspace/[artifactId]#GET",
        message: `Artifact ${artifactId} not found.`,
      });
    }

    return Response.json({ artifact });
  },
);

/** PATCH /api/ai-assistant/workspace/[artifactId] */
export const PATCH = withApiGuardrails(
  "ai-assistant/workspace/[artifactId]#PATCH",
  async ({ request, params }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "ai-assistant/workspace/[artifactId]#PATCH",
        message: "Authentication required.",
      });
    }

    const { artifactId } = await params;
    const body = await request.json() as {
      content?: Record<string, unknown>;
      title?: string;
      status?: ArtifactStatus;
      contextSnapshot?: Record<string, unknown>;
      tags?: string[];
      sessionId?: string;
      action?: "promote" | "archive";
      promoteTo?: PromoteTarget;
    };

    if (body.action === "archive") {
      const result = await archiveArtifact(artifactId, user.id);
      if ("error" in result) {
        throw new GuardrailError({ code: "DB_ERROR", where: "ai-assistant/workspace/[artifactId]#PATCH", message: result.error });
      }
      return Response.json({ ok: true, action: "archived" });
    }

    if (body.action === "promote") {
      if (!body.promoteTo) {
        throw new GuardrailError({ code: "VALIDATION_ERROR", where: "ai-assistant/workspace/[artifactId]#PATCH", message: "promoteTo is required for promote action." });
      }
      const result = await promoteArtifact(artifactId, user.id, body.promoteTo);
      if ("error" in result) {
        throw new GuardrailError({ code: "DB_ERROR", where: "ai-assistant/workspace/[artifactId]#PATCH", message: result.error });
      }
      return Response.json({ ok: true, action: "promoted", promotedTo: body.promoteTo });
    }

    const result = await updateArtifact(artifactId, user.id, {
      content: body.content,
      title: body.title,
      status: body.status,
      contextSnapshot: body.contextSnapshot,
      tags: body.tags,
      sessionId: body.sessionId,
    });

    if ("error" in result) {
      throw new GuardrailError({ code: "DB_ERROR", where: "ai-assistant/workspace/[artifactId]#PATCH", message: result.error });
    }

    return Response.json({ ok: true, id: result.id, version: result.version });
  },
);

/** DELETE /api/ai-assistant/workspace/[artifactId] — hard delete */
export const DELETE = withApiGuardrails(
  "ai-assistant/workspace/[artifactId]#DELETE",
  async ({ params }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "ai-assistant/workspace/[artifactId]#DELETE",
        message: "Authentication required.",
      });
    }

    const { artifactId } = await params;
    const { createServiceClient } = await import("@/lib/supabase/service");
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("workspace_artifacts")
      .delete()
      .eq("id", artifactId)
      .eq("user_id", user.id);

    if (error) {
      throw new GuardrailError({ code: "DB_ERROR", where: "ai-assistant/workspace/[artifactId]#DELETE", message: error.message });
    }

    return Response.json({ ok: true });
  },
);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit 2>&1 | grep -E "workspace/route|workspace/\[artifact"
```

Expected: no output.

- [ ] **Step 4: Run route check**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run check:routes 2>&1 | grep workspace
```

Expected: no conflicts.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/ai-assistant/workspace/route.ts \
        frontend/src/app/api/ai-assistant/workspace/[artifactId]/route.ts
git commit -m "feat(api): add workspace artifact CRUD routes"
```

---

## Task 7: Full Quality Gate + Smoke Test

**Files:** No new files.

- [ ] **Step 1: Run the full quality gate**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run quality 2>&1
```

Expected: `0 errors` from TypeScript, `0 errors` from ESLint.

Fix any issues before continuing.

- [ ] **Step 2: Verify dev server starts clean**

```bash
cd /Users/meganharrison/Documents/alleato-pm && rm -rf frontend/.next && npm run dev:frontend > /tmp/nextjs-dev.log 2>&1 &
sleep 12 && tail -25 /tmp/nextjs-dev.log
```

Expected: `✓ Ready in Xs` with no compilation errors.

- [ ] **Step 3: Smoke test the API routes**

```bash
# These will 401 without a real session cookie, which is expected behavior.
# A 401 means the route compiled and is reachable. A 500 means a code error.

curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/ai-assistant/workspace
# Expected: 401

curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/ai-assistant/workspace/00000000-0000-0000-0000-000000000000
# Expected: 401
```

- [ ] **Step 4: Final commit if any lint fixes were needed**

```bash
git add -p  # stage any lint-fix changes
git commit -m "fix(ai): quality gate fixes for workspace artifacts"
```

---

## Self-Review Checklist

**Spec coverage:**

| Requirement | Task |
|-------------|------|
| `workspace_artifacts` table with all listed columns + RLS | Task 1 |
| `search_workspace_artifacts` RPC function | Task 1 |
| `createArtifact`, `updateArtifact`, `getArtifact`, `listArtifacts`, `searchArtifacts`, `promoteArtifact`, `archiveArtifact` | Task 2 |
| `getDraftArtifact` AI tool (by ID or natural language) | Task 3 |
| `listWorkspaceArtifacts` AI tool | Task 3 |
| `saveWorkspaceArtifact` AI tool (create or upsert) | Task 3 |
| `promoteWorkspaceArtifact` AI tool | Task 3 |
| Inject active drafts into `assembleSystemPrompt()` | Task 5 |
| `GET /api/ai-assistant/workspace` | Task 6 |
| `POST /api/ai-assistant/workspace` | Task 6 |
| `GET /api/ai-assistant/workspace/[artifactId]` | Task 6 |
| `PATCH /api/ai-assistant/workspace/[artifactId]` | Task 6 |
| `DELETE /api/ai-assistant/workspace/[artifactId]` | Task 6 |
| Wire tools into `createStrategistTools()` | Task 4 |
| Versioning (auto-increment on every update) | Task 2 — `updateArtifact` increments `version` |
| Natural language retrieval | Task 2 — `searchArtifacts` + Task 3 — `getDraftArtifact` |
| Promote/archive flow | Task 2 — `promoteArtifact` / `archiveArtifact` + Task 3 — `promoteWorkspaceArtifact` |
| "What we were building last session" at conversation start | Task 5 — `buildWorkspaceContextBlock` injected into prompt |

All spec requirements have corresponding tasks. No gaps found.
