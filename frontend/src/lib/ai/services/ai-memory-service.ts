/**
 * AI Memory Service
 *
 * Core read/write layer for the `ai_memories` table.
 *
 * Improvements over v1:
 *   - Deduplication: before insert, search for a near-duplicate (similarity > 0.88)
 *     and update it instead of creating a second copy.
 *   - Commitment bridge: commitment memories auto-create an ai_insights action item.
 *   - Team visibility: writeMemory accepts visibility param; team memories are
 *     injected for all users.
 *   - Token-capped injection: buildMemoryContextBlock caps at ~600 tokens,
 *     ranked by importance × recency.
 */

import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MemoryType = "fact" | "preference" | "lesson" | "commitment" | "context";
export type MemorySource = "conversation" | "extraction" | "meeting_ingest" | "manual";
export type MemoryVisibility = "private" | "team";

export interface AiMemory {
  id: string;
  type: MemoryType;
  content: string;
  confidence: number;
  importance: number;
  project_id: number | null;
  meeting_id: string | null;
  source: MemorySource;
  visibility?: MemoryVisibility;
  created_at: string;
  similarity?: number;
}

// ---------------------------------------------------------------------------
// Lazy OpenAI client
// ---------------------------------------------------------------------------

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const gatewayKey = process.env.AI_GATEWAY_API_KEY;
    if (gatewayKey) {
      _openai = new OpenAI({
        apiKey: gatewayKey,
        baseURL: "https://ai-gateway.vercel.sh/v1",
      });
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("AI_GATEWAY_API_KEY or OPENAI_API_KEY not set");
      _openai = new OpenAI({ apiKey });
    }
  }
  return _openai;
}

export async function embed(text: string): Promise<number[]> {
  // ai_memories.embedding is halfvec(3072) — must use text-embedding-3-large at 3072 dims
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-large",
    dimensions: 3072,
    input: text.substring(0, 8000),
  });
  return response.data[0].embedding;
}

// ---------------------------------------------------------------------------
// Write (with deduplication)
// ---------------------------------------------------------------------------

export interface WriteMemoryParams {
  userId: string;
  type: MemoryType;
  content: string;
  projectId?: number | null;
  meetingId?: string | null;
  confidence?: number;
  importance?: number;
  source?: MemorySource;
  visibility?: MemoryVisibility;
  expiresAt?: Date | null;
}

/**
 * Write a memory. Before inserting, checks for a near-duplicate (>0.88 similarity
 * of the same type) and updates it instead. Commitment memories automatically
 * create a corresponding ai_insights action item.
 *
 * Returns: { id, action: "created" | "updated" } or { error }
 */
export async function writeMemory(
  params: WriteMemoryParams,
): Promise<{ id: string; action: "created" | "updated" } | { error: string }> {
  const supabase = createServiceClient();

  try {
    const embeddingVec = await embed(params.content);
    const embeddingJson = JSON.stringify(embeddingVec);

    // --- Deduplication ---
    const { data: dupRows, error: dupError } = await supabase.rpc("find_duplicate_memory", {
      query_embedding: embeddingJson,
      p_user_id: params.userId,
      p_type: params.type,
      similarity_threshold: 0.88,
    });

    if (dupError) {
      return { error: `Duplicate memory check failed: ${dupError.message}` };
    }

    if (dupRows && dupRows.length > 0) {
      const dup = dupRows[0] as { id: string };
      const { error: updateError } = await supabase
        .from("ai_memories")
        .update({
          content: params.content,
          embedding: embeddingJson,
          confidence: params.confidence ?? 0.9,
          importance: Math.max(
            (dupRows[0] as { importance: number }).importance,
            params.importance ?? 0.5,
          ),
          last_accessed_at: new Date().toISOString(),
        })
        .eq("id", dup.id);

      if (updateError) return { error: updateError.message };
      return { id: dup.id, action: "updated" };
    }

    // --- Fresh insert ---
    let expiresAt = params.expiresAt;
    if (expiresAt === undefined && params.type === "context") {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      expiresAt = d;
    }

    // Guard: verify project_id exists before inserting to prevent FK violations.
    // If the AI passed a project ID that doesn't exist, save the memory without
    // a project link rather than failing the entire write.
    let safeProjectId: number | null = params.projectId ?? null;
    if (safeProjectId !== null) {
      const { data: projectRow } = await supabase
        .from("projects")
        .select("id")
        .eq("id", safeProjectId)
        .maybeSingle();
      if (!projectRow) {
        console.warn(`[ai-memory-service] project_id ${safeProjectId} not found — saving memory without project link`);
        safeProjectId = null;
      }
    }

    const { data, error } = await supabase
      .from("ai_memories")
      .insert({
        user_id: params.userId,
        type: params.type,
        content: params.content,
        embedding: embeddingJson,
        project_id: safeProjectId,
        meeting_id: params.meetingId ?? null,
        confidence: params.confidence ?? 0.9,
        importance: params.importance ?? 0.5,
        source: params.source ?? "conversation",
        visibility: params.visibility ?? "private",
        expires_at: expiresAt?.toISOString() ?? null,
      })
      .select("id")
      .single();

    if (error) return { error: `Memory save failed: ${error.message}` };
    const memoryId = data.id;

    // --- Commitment bridge ---
    // Commitment memories automatically surface as action items in ai_insights
    if (params.type === "commitment" && params.projectId) {
      await bridgeCommitmentToInsight({
        content: params.content,
        projectId: params.projectId,
        meetingId: params.meetingId ?? undefined,
        memoryId,
      });
    }

    return { id: memoryId, action: "created" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// Commitment → ai_insights bridge
// ---------------------------------------------------------------------------

async function bridgeCommitmentToInsight(params: {
  content: string;
  projectId: number;
  meetingId?: string;
  memoryId: string;
}): Promise<void> {
  const supabase = createServiceClient();

  // Avoid duplicate action items: check if one already exists with this content
  const { data: existing, error: existingError } = await supabase
    .from("ai_insights")
    .select("id")
    .eq("project_id", params.projectId)
    .eq("insight_type", "action_item")
    .ilike("title", params.content.substring(0, 80) + "%")
    .limit(1);

  if (existingError) {
    throw new Error(`Failed to check commitment insight duplicate: ${existingError.message}`);
  }

  if (existing && existing.length > 0) return;

  const { error: insertError } = await supabase.from("ai_insights").insert({
    project_id: params.projectId,
    title: params.content.substring(0, 255),
    description:
      `Commitment captured by AI assistant: ${params.content}\n\n` +
      `Source: memory ID ${params.memoryId}`,
    insight_type: "action_item",
    severity: "medium",
    status: "open",
    confidence_score: 80,
    meeting_id: params.meetingId ?? null,
  });

  if (insertError) {
    throw new Error(`Failed to create commitment insight from memory: ${insertError.message}`);
  }
}

// ---------------------------------------------------------------------------
// Read: semantic search (user-scoped)
// ---------------------------------------------------------------------------

export async function searchMemories(params: {
  userId: string;
  query: string;
  type?: MemoryType;
  projectId?: number;
  matchCount?: number;
  matchThreshold?: number;
}): Promise<AiMemory[]> {
  const supabase = createServiceClient();

  try {
    const embeddingVec = await embed(params.query);

    const { data, error } = await supabase.rpc("search_ai_memories", {
      query_embedding: JSON.stringify(embeddingVec),
      p_user_id: params.userId,
      match_count: params.matchCount ?? 8,
      match_threshold: params.matchThreshold ?? 0.45,
      filter_type: params.type ?? undefined,
      filter_project_id: params.projectId ?? undefined,
    });

    if (error) {
      throw new Error(`AI memory search failed: ${error.message}`);
    }
    if (!data) return [];

    const ids = (data as AiMemory[]).map((m) => m.id);
    if (ids.length > 0) {
      supabase
        .rpc("touch_ai_memories", { memory_ids: ids })
        .then(({ error: touchError }) => {
          if (touchError) {
            console.error("[ai-memory-service] Failed to touch memories:", touchError);
          }
        });
    }

    return data as AiMemory[];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown memory search error";
    throw new Error(message);
  }
}

// ---------------------------------------------------------------------------
// Read: team-visible memories
// ---------------------------------------------------------------------------

async function searchTeamMemories(params: {
  query: string;
  matchCount?: number;
}): Promise<AiMemory[]> {
  const supabase = createServiceClient();

  try {
    const embeddingVec = await embed(params.query);

    const { data, error } = await supabase.rpc("search_team_memories", {
      query_embedding: JSON.stringify(embeddingVec),
      match_count: params.matchCount ?? 4,
      match_threshold: 0.5,
    });

    if (error) {
      throw new Error(`Team memory search failed: ${error.message}`);
    }
    if (!data) return [];
    return data as AiMemory[];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown team memory search error";
    throw new Error(message);
  }
}

// ---------------------------------------------------------------------------
// Read: preferences (always inject — no semantic search needed)
// ---------------------------------------------------------------------------

export async function getUserPreferences(userId: string): Promise<AiMemory[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("ai_memories")
    .select(
      "id, type, content, confidence, importance, project_id, meeting_id, source, visibility, created_at",
    )
    .eq("user_id", userId)
    .eq("type", "preference")
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("importance", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`User preference memory lookup failed: ${error.message}`);
  }
  if (!data) return [];
  return data as AiMemory[];
}

// ---------------------------------------------------------------------------
// Read: CRUD for admin UI
// ---------------------------------------------------------------------------

export async function getUserMemories(
  userId: string,
  opts?: { type?: MemoryType; limit?: number; offset?: number },
): Promise<{ memories: AiMemory[]; total: number }> {
  const supabase = createServiceClient();

  let query = supabase
    .from("ai_memories")
    .select(
      "id, type, content, confidence, importance, project_id, meeting_id, source, visibility, created_at, last_accessed_at, access_count, expires_at",
      { count: "exact" },
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (opts?.type) query = query.eq("type", opts.type);

  const { data, count, error } = await query
    .range(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 50) - 1);

  if (error || !data) return { memories: [], total: 0 };
  return { memories: data as unknown as AiMemory[], total: count ?? 0 };
}

export async function deleteMemory(
  userId: string,
  memoryId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("ai_memories")
    .update({ is_active: false })
    .eq("id", memoryId)
    .eq("user_id", userId); // RLS belt-and-suspenders

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateMemoryContent(
  userId: string,
  memoryId: string,
  content: string,
  importance?: number,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const embeddingVec = await embed(content);

  const { error } = await supabase
    .from("ai_memories")
    .update({
      content,
      embedding: JSON.stringify(embeddingVec),
      ...(importance !== undefined ? { importance } : {}),
    })
    .eq("id", memoryId)
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Inject: token-capped context block for system prompt
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<MemoryType, string> = {
  preference: "Your Preferences",
  context: "Recent Context",
  commitment: "Open Commitments",
  fact: "Key Facts",
  lesson: "Patterns & Lessons",
};

const INJECTION_ORDER: MemoryType[] = [
  "preference",
  "context",
  "commitment",
  "fact",
  "lesson",
];

const MAX_INJECT_TOKENS = 600; // ~2,400 chars

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function recencyFactor(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  return 1 / (ageDays / 7 + 1); // 0-day = 1.0, 7-day = 0.5, 30-day = 0.18
}

/**
 * Build the memory context block to prepend to the system prompt.
 * - Caps at MAX_INJECT_TOKENS to avoid context bloat
 * - Ranks by importance × recency
 * - Preferences are always first; never truncated
 */
export function buildMemoryContextBlock(
  preferences: AiMemory[],
  relevantMemories: AiMemory[],
  teamMemories: AiMemory[] = [],
): string | null {
  const payload = buildMemoryContextPayload(preferences, relevantMemories, teamMemories);
  return payload.block;
}

export function buildMemoryContextPayload(
  preferences: AiMemory[],
  relevantMemories: AiMemory[],
  teamMemories: AiMemory[] = [],
): { block: string | null; selected: AiMemory[] } {
  // Deduplicate by id
  const seen = new Set<string>();
  const all: AiMemory[] = [];
  for (const m of [...preferences, ...relevantMemories, ...teamMemories]) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      all.push(m);
    }
  }

  if (all.length === 0) return { block: null, selected: [] };

  // Sort non-preference memories by importance × recency
  const prefs = all.filter((m) => m.type === "preference");
  const others = all
    .filter((m) => m.type !== "preference")
    .sort(
      (a, b) =>
        b.importance * recencyFactor(b.created_at) -
        a.importance * recencyFactor(a.created_at),
    );

  // Token-cap: always include all preferences, then fill others until budget
  const selected: AiMemory[] = [...prefs];
  let tokens = estimateTokens(prefs.map((m) => m.content).join("\n"));
  for (const m of others) {
    const t = estimateTokens(m.content);
    if (tokens + t > MAX_INJECT_TOKENS) break;
    selected.push(m);
    tokens += t;
  }

  if (selected.length === 0) return { block: null, selected: [] };

  const byType = new Map<MemoryType, AiMemory[]>();
  for (const m of selected) {
    if (!byType.has(m.type)) byType.set(m.type, []);
    byType.get(m.type)!.push(m);
  }

  const lines: string[] = [
    "## What I Know About You And Your Projects",
    "",
    "Use this context to personalize every response. These are durable memories from past sessions.",
    "",
  ];

  for (const type of INJECTION_ORDER) {
    const items = byType.get(type);
    if (!items?.length) continue;
    lines.push(`### ${TYPE_LABELS[type]}`);
    for (const m of items) {
      lines.push(`- ${m.content}`);
    }
    lines.push("");
  }

  return {
    block: lines.join("\n"),
    selected,
  };
}

// ---------------------------------------------------------------------------
// Session fetch: preferences + semantic + team (parallel)
// ---------------------------------------------------------------------------

export async function getMemoriesForSession(params: {
  userId: string;
  firstMessage: string;
  projectId?: number;
}): Promise<{
  preferences: AiMemory[];
  relevant: AiMemory[];
  team: AiMemory[];
  errors: string[];
}> {
  const [preferencesResult, relevantResult, teamResult] = await Promise.allSettled([
    getUserPreferences(params.userId),
    searchMemories({
      userId: params.userId,
      query: params.firstMessage,
      projectId: params.projectId,
      matchCount: 6,
      matchThreshold: 0.5,
    }),
    searchTeamMemories({
      query: params.firstMessage,
      matchCount: 4,
    }),
  ]);

  const errors: string[] = [];
  const unwrap = (label: string, result: PromiseSettledResult<AiMemory[]>): AiMemory[] => {
    if (result.status === "fulfilled") return result.value;
    const message =
      result.reason instanceof Error ? result.reason.message : String(result.reason);
    errors.push(`${label}: ${message}`);
    return [];
  };

  const preferences = unwrap("preferences", preferencesResult);
  const relevant = unwrap("relevant memories", relevantResult);
  const team = unwrap("team memories", teamResult);

  return { preferences, relevant, team, errors };
}
