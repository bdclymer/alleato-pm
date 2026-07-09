/**
 * Unified RAG document retrieval layer.
 *
 * This module owns the entire "embed query → call search_document_chunks → normalize rows"
 * flow. All RAG retrieval goes through here so:
 * - Embedding encoding is decided in ONE place (JSON string, never raw array)
 * - RPC args (thresholds, counts, filters) are consolidated
 * - Error handling is loud (no silent fallbacks)
 * - Row normalization is consistent
 *
 * This design prevents encoding mismatches and makes retrieval contract violations
 * observable at compile time (one interface, all callers).
 */

import { OpenAI } from "@ai-sdk/openai";
import { generateEmbedding, EMBEDDING } from "@/lib/ai/tools/tool-utils";
import {
  createRagServiceClient,
  type ServiceClientReturnType,
} from "@/lib/supabase/service";

export type RagRow = {
  id?: string;
  chunk_text?: string;
  doc_title?: string;
  doc_metadata?: Record<string, unknown>;
  similarity?: number;
  document_id?: string;
};

export interface RetrieveChunksOptions {
  /** Query text to embed and search for */
  query: string;

  /** OpenAI client (required for embedding generation) */
  openai: OpenAI;

  /** Optional: Supabase RAG client. If not provided, creates one. */
  ragClient?: ServiceClientReturnType;

  /** Optional: Project ID to scope search to this project */
  projectId?: number | null;

  /** Optional: Filter to specific source types (e.g., ["email", "teams_dm"]) */
  sourceTypes?: string[] | null;

  /** Optional: Max number of chunks to return (default: 10) */
  matchCount?: number;

  /** Optional: Similarity threshold, 0–1 (default: 0.45) */
  matchThreshold?: number;

  /** Optional: Enable hybrid ranking (vector + BM25) */
  hybridRankingEnabled?: boolean;

  /** Optional: Enable retrieval telemetry */
  telemetryEnabled?: boolean;

  /** Optional: Label for error messages */
  errorLabel?: string;
}

/**
 * Retrieve RAG document chunks for a query.
 *
 * Handles all retrieval details: embedding generation (stringified JSON),
 * RPC args normalization, error handling, row return.
 *
 * @param opts Retrieval options
 * @returns Array of matching chunks
 * @throws Error if retrieval fails (never silent)
 */
export async function retrieveChunks(opts: RetrieveChunksOptions): Promise<RagRow[]> {
  const {
    query,
    openai,
    ragClient: providedRagClient,
    projectId,
    sourceTypes,
    matchCount = 10,
    matchThreshold = 0.45,
    hybridRankingEnabled = false,
    telemetryEnabled = false,
    errorLabel = "Document retrieval",
  } = opts;

  // Generate embedding via the canonical helper (returns JSON-stringified vector)
  const queryEmbedding = await generateEmbedding(openai, query, EMBEDDING.LARGE);

  // Use provided client or create one
  const ragClient = providedRagClient ?? createRagServiceClient();

  // Call the RPC with all standardized args
  const { data, error } = await ragClient.rpc("search_document_chunks", {
    query_embedding: queryEmbedding, // Always a JSON string from generateEmbedding
    filter_source_types: sourceTypes ?? undefined,
    filter_project_id: typeof projectId === "number" ? projectId : undefined,
    match_count: matchCount,
    match_threshold: matchThreshold,
    ...(hybridRankingEnabled && {
      ranking_mode: "hybrid",
      query_text: query,
    }),
    ...(telemetryEnabled && {
      telemetry_enabled: true,
    }),
  });

  // Error handling: always loud, never silent
  if (error) {
    const message = (error as { message?: string }).message || String(error);
    throw new Error(`${errorLabel}: ${message}`);
  }

  return (data ?? []) as RagRow[];
}

/**
 * Specialized retrieval for category-scoped searches (e.g., emails, Teams, meetings).
 *
 * Used by the assistant's category document search tool to retrieve chunks
 * for a specific content type with consistent defaults.
 */
export async function retrieveChunksByCategory(opts: {
  query: string;
  openai: OpenAI;
  ragClient?: ServiceClientReturnType;
  projectId?: number | null;
  sourceTypes?: string[] | null;
  matchCount?: number;
  errorLabel?: string;
}): Promise<RagRow[]> {
  return retrieveChunks({
    ...opts,
    matchThreshold: 0.45, // Category search threshold
    matchCount: opts.matchCount ?? 10,
  });
}
