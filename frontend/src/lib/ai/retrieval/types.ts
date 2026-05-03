import type { AssistantIntent } from "@/lib/ai/intent-router";
import type { SourceSpecificRagKind } from "@/lib/ai/detect-rag-request";
import type { ClientProjectIntelligencePacket } from "@/lib/ai/intelligence/types";

export type ExternalSource = "meetings" | "teams" | "email" | "onedrive";
export type SubAgent = "cfo" | "coo" | "cro" | "chro" | "vpbd";

export type ResponseFormat =
  | "briefing_template"
  | "conversational"
  | "rfi_preview"
  | "brandon_daily"
  | "source_lookup"
  | "source_specific_rag"
  | "app_help";

export type RetrievalPlan = {
  intent: AssistantIntent;
  responseFormat: ResponseFormat;
  sources: {
    intelligencePacket?: { mode: "additive" | "replace" };
    projectSnapshot?: { reason: "intent" | "fallback" };
    semanticVectorSearch?: { query: string };
    externalSources?: ExternalSource[];
    sourceSpecificRag?: { kind: SourceSpecificRagKind };
    reusePriorBriefing?: boolean;
    brandonDailyUpdate?: boolean;
  };
  preconsult?: SubAgent[];
  selectedProjectId?: number;
  reason: string;
};

export type RetrievalContext = {
  intelligencePacket?: ClientProjectIntelligencePacket | null;
  intelligenceTargetSlug?: string;
  projectSnapshot?: unknown;
  semanticVectorResults?: unknown;
  executiveBriefingRetrieval?: unknown;
  sourceSpecificRagAnswer?: { content: string; rows: unknown[] } | null;
  brandonDailyUpdatePacket?: unknown;
  reusedFromPriorBriefing?: boolean;
  warnings: Array<{ source: string; message: string }>;
  durationsMs: Record<string, number>;
};
