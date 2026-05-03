// frontend/src/lib/ai/retrieval/system-prompt.ts
import type { RetrievalPlan, RetrievalContext } from "./types";

export function assembleSystemPromptFromContext(
  plan: RetrievalPlan,
  ctx: RetrievalContext,
  basePrompt: string,
): string {
  const parts: string[] = [];

  if (ctx.intelligencePacket) {
    parts.push(
      `# Current Project Intelligence Packet\n\nA pre-rendered intelligence packet is available below. Use it as your primary evidence. Layer your own analysis, recommendations, and follow-up questions on top.\n\n${JSON.stringify(ctx.intelligencePacket, null, 2)}`,
    );
  }

  if (ctx.projectSnapshot) {
    parts.push(
      `# Project Briefing Snapshot\n\n${JSON.stringify(ctx.projectSnapshot, null, 2)}`,
    );
  }

  if (ctx.semanticVectorResults) {
    parts.push(
      `# Vector Search Results\n\n${JSON.stringify(ctx.semanticVectorResults, null, 2)}`,
    );
  }

  if (ctx.executiveBriefingRetrieval) {
    parts.push(
      `# Recent Communication Signals\n\n${JSON.stringify(ctx.executiveBriefingRetrieval, null, 2)}`,
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

  // Reference the plan to silence unused-parameter lint without changing behavior.
  // The plan is available for future format-specific assembly logic (e.g. brandon_daily, rfi_preview).
  void plan;

  if (parts.length === 0) {
    return basePrompt;
  }

  return `${parts.join("\n\n---\n\n")}\n\n---\n\n${basePrompt}`;
}
