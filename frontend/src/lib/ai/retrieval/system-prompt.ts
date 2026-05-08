// frontend/src/lib/ai/retrieval/system-prompt.ts
import type { RetrievalPlan, RetrievalContext } from "./types";

const MAX_CHUNK_CHARS = 1200;
const MAX_VECTOR_RESULTS = 8;

type SemanticResult = {
  content?: string;
  sourceTable?: string;
  recordId?: string | number;
  similarity?: number;
  finalScore?: number;
  createdAt?: string | null;
  metadata?: Record<string, unknown>;
};

function renderSemanticResults(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const wrapper = raw as { results?: SemanticResult[]; resultCount?: number };
  const results = Array.isArray(wrapper.results) ? wrapper.results : [];
  if (results.length === 0) return "";

  const sliced = results.slice(0, MAX_VECTOR_RESULTS);
  const lines = sliced.map((r, i) => {
    const content = (r.content ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_CHUNK_CHARS);
    const date = r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "unknown date";
    const score = typeof r.finalScore === "number" ? r.finalScore.toFixed(2) : "?";
    const source = r.sourceTable ?? "unknown";
    const title =
      (r.metadata?.subject as string | undefined) ??
      (r.metadata?.title as string | undefined) ??
      (r.metadata?.meeting_title as string | undefined) ??
      "";
    const heading = title ? `${source} · ${title}` : source;
    return `[${i + 1}] (${heading}, ${date}, score=${score})\n${content}`;
  });

  return lines.join("\n\n");
}

export function assembleSystemPromptFromContext(
  plan: RetrievalPlan,
  ctx: RetrievalContext,
  basePrompt: string,
): string {
  const parts: string[] = [];

  if (ctx.intelligencePacket) {
    // Intelligence packet is structured — keep as JSON but compact (no whitespace pad).
    parts.push(
      `# Current Project Intelligence Packet\n\nA pre-rendered intelligence packet is available below. Use it as your primary evidence. Layer your own analysis, recommendations, and follow-up questions on top.\n\n${JSON.stringify(ctx.intelligencePacket)}`,
    );
  }

  if (ctx.projectSnapshot) {
    parts.push(
      `# Project Briefing Snapshot\n\n${JSON.stringify(ctx.projectSnapshot)}`,
    );
  }

  if (ctx.semanticVectorResults) {
    const rendered = renderSemanticResults(ctx.semanticVectorResults);
    if (rendered) {
      parts.push(
        `# Retrieved Evidence (semantic search)\n\nThe following passages were retrieved from meeting transcripts, emails, Teams messages, OneDrive docs, and the company knowledge base. Cite by source/date when answering. If the evidence does not cover the question, say so explicitly.\n\n${rendered}`,
      );
    }
  }

  if (ctx.executiveBriefingRetrieval) {
    parts.push(
      `# Recent Communication Signals\n\n${JSON.stringify(ctx.executiveBriefingRetrieval)}`,
    );
  }

  if (ctx.sourceSpecificRagAnswer) {
    parts.push(
      `# Source-Specific RAG Result\n\n${ctx.sourceSpecificRagAnswer.content}`,
    );
  }

  if (ctx.warnings.length > 0) {
    const lines = ctx.warnings.map((w) => `- ${w.source}: ${w.message}`).join("\n");
    parts.push(
      `# Sources Unavailable\nThe following sources were attempted and did not return in time. Acknowledge this gap in your answer and proceed with what you have.\n${lines}`,
    );
  }

  void plan;

  if (parts.length === 0) {
    return basePrompt;
  }

  return `${parts.join("\n\n---\n\n")}\n\n---\n\n${basePrompt}`;
}
