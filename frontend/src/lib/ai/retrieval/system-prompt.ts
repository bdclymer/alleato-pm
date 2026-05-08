// frontend/src/lib/ai/retrieval/system-prompt.ts
//
// Assembles the V2 (planner-driven) system prompt from the base strategist
// prompt + retrieval context.
//
// Why compact rendering matters:
//   The previous implementation dumped every retrieved source through
//   JSON.stringify(value, null, 2). For an 8-result semantic search where
//   meeting transcripts can carry 5000 chars per result, that pushed the
//   prompt past ~50K chars and ~13K tokens. Combined with the strategist's
//   ~100-tool toolset, the AI Gateway returned finishReason: "other" with
//   zero output — the request payload was too large and the model bailed.
//
// What this module does now:
//   - Renders known-shape sources as compact markdown (vector results as a
//     numbered list with truncated snippets; intelligence packets as their
//     summary fields + card titles, dropping the duplicate packetJson blob).
//   - Strips JSON whitespace for unknown-shape sources.
//   - Hard-caps each section so a single bloated source can't blow past the
//     budget. Total prompt is also capped, with a graceful tail truncation.
//   - Logs the assembled prompt size so context bloat surfaces in dev logs
//     before it costs money in production.

import type { RetrievalPlan, RetrievalContext } from "./types";

// Inlined dev-only token logger. We avoid importing from
// @/lib/ai/system-prompt to keep this module free of transitive deps
// (providers, db/utils, bcrypt-ts) — both for test isolation and so this
// rendering path stays cheap to require.
function logSystemPromptTokensInDev(prompt: string, label: string): void {
  if (process.env.NODE_ENV === "production") return;
  const approxTokens = Math.ceil(prompt.length / 4);
  console.log(
    `[system-prompt] ${label} approx tokens=${approxTokens} chars=${prompt.length}`,
  );
}

// ---------------------------------------------------------------------------
// Size budgets
// ---------------------------------------------------------------------------
// These are character budgets (~4 chars/token). Tuned so the assembled prompt
// stays under ~30K chars (~7.5K tokens) of retrieval context, leaving room for
// the ~10K-char base strategist prompt and tool schemas.
const PER_VECTOR_RESULT_CONTENT = 1200;
const MAX_VECTOR_RESULTS = 8;
const PER_SECTION_CAP = 12_000;
const TOTAL_RETRIEVAL_CAP = 30_000;

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "\n…[truncated]";
}

// JSON.stringify with no whitespace + null fields stripped. This is the
// fallback for shapes we don't have a bespoke renderer for.
function stringifyCompact(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (v === null ? undefined : v));
}

// ---------------------------------------------------------------------------
// Bespoke renderers per source
// ---------------------------------------------------------------------------

type VectorResult = {
  content?: string;
  sourceTable?: string;
  recordId?: string;
  sourceDocumentId?: string | null;
  sourceChunkId?: string | null;
  similarity?: number;
  finalScore?: number;
  projectIds?: number[];
  createdAt?: string | null;
};

function renderVectorResults(value: unknown): string {
  const obj = value as { results?: VectorResult[]; resultCount?: number; message?: string } | null;
  if (!obj) return "";
  if (obj.message && (!obj.results || obj.results.length === 0)) {
    return obj.message;
  }
  const results = (obj.results ?? []).slice(0, MAX_VECTOR_RESULTS);
  if (results.length === 0) return "(no matches)";
  const lines = results.map((r, i) => {
    const header = [
      `### [${i + 1}] ${r.sourceTable ?? "document"}`,
      r.createdAt ? `(${r.createdAt})` : "",
      typeof r.similarity === "number" ? `sim=${r.similarity.toFixed(3)}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const content = clip((r.content ?? "").trim(), PER_VECTOR_RESULT_CONTENT);
    const ref = [
      r.sourceDocumentId ? `doc:${r.sourceDocumentId}` : "",
      r.sourceChunkId ? `chunk:${r.sourceChunkId}` : "",
      r.projectIds && r.projectIds.length > 0 ? `projects:[${r.projectIds.join(",")}]` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return [header, ref, content].filter(Boolean).join("\n");
  });
  return lines.join("\n\n");
}

function renderIntelligencePacket(value: unknown): string {
  const p = value as Record<string, unknown> | null;
  if (!p) return "";
  // Drop packetJson (duplicates cards), evidence blobs (heavy), metadata bags.
  const compact = {
    targetId: p.targetId,
    packetType: p.packetType,
    generatedAt: p.generatedAt,
    freshnessStatus: p.freshnessStatus,
    executiveSummary: p.executiveSummary,
    currentStatus: p.currentStatus,
    strategicRead: p.strategicRead,
    whyItMatters: p.whyItMatters,
    recommendedNextMoves: p.recommendedNextMoves,
    confidenceSummary: p.confidenceSummary,
    sourceCoverage: p.sourceCoverage,
    reviewQueueCount: p.reviewQueueCount,
    staleItemCount: p.staleItemCount,
    cards: Array.isArray(p.cards)
      ? (p.cards as Array<Record<string, unknown>>).map((c) => ({
          kind: c.kind,
          title: c.title,
          summary: c.summary,
          priority: c.priority,
          status: c.status,
          confidence: c.confidence,
          nextAction: c.nextAction,
          sourceCount: c.sourceCount,
        }))
      : undefined,
  };
  return stringifyCompact(compact);
}

function renderProjectSnapshot(value: unknown): string {
  // Snapshot is already a structured tool result — compact JSON keeps fidelity
  // without the whitespace bloat. Section cap below trims if it's still big.
  return stringifyCompact(value);
}

function renderExecutiveBriefing(value: unknown): string {
  return stringifyCompact(value);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function assembleSystemPromptFromContext(
  plan: RetrievalPlan,
  ctx: RetrievalContext,
  basePrompt: string,
): string {
  // Reference plan to silence unused-param lint; kept for future format-specific routing.
  void plan;

  const sections: string[] = [];

  if (ctx.intelligencePacket) {
    const body = clip(renderIntelligencePacket(ctx.intelligencePacket), PER_SECTION_CAP);
    sections.push(
      `# Current Project Intelligence Packet\n\nA pre-rendered intelligence packet is available below. Use it as your primary evidence. Layer your own analysis, recommendations, and follow-up questions on top.\n\n${body}`,
    );
  }

  if (ctx.projectSnapshot) {
    const body = clip(renderProjectSnapshot(ctx.projectSnapshot), PER_SECTION_CAP);
    sections.push(`# Project Briefing Snapshot\n\n${body}`);
  }

  if (ctx.semanticVectorResults) {
    const body = clip(renderVectorResults(ctx.semanticVectorResults), PER_SECTION_CAP);
    sections.push(`# Vector Search Results\n\n${body}`);
  }

  if (ctx.executiveBriefingRetrieval) {
    const body = clip(renderExecutiveBriefing(ctx.executiveBriefingRetrieval), PER_SECTION_CAP);
    sections.push(`# Recent Communication Signals\n\n${body}`);
  }

  if (ctx.sourceSpecificRagAnswer) {
    const body = clip(ctx.sourceSpecificRagAnswer.content, PER_SECTION_CAP);
    sections.push(`# Source-Specific RAG Result\n\n${body}`);
  }

  if (ctx.warnings.length > 0) {
    const lines = ctx.warnings.map((w) => `- ${w.source}: ${w.message}`).join("\n");
    sections.push(
      `# Sources Unavailable\nThe following sources were attempted and did not return in time. Acknowledge this gap in your answer and proceed with what you have.\n${lines}`,
    );
  }

  if (sections.length === 0) {
    logSystemPromptTokensInDev(basePrompt, "v2:no-retrieval");
    return basePrompt;
  }

  const retrievalBlock = clip(sections.join("\n\n---\n\n"), TOTAL_RETRIEVAL_CAP);
  const finalPrompt = `${retrievalBlock}\n\n---\n\n${basePrompt}`;
  logSystemPromptTokensInDev(finalPrompt, "v2:with-retrieval");
  return finalPrompt;
}
