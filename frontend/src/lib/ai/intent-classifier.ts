import { generateObject } from "ai";
import { z } from "zod";

import { getLanguageModel } from "@/lib/ai/providers";
import {
  shouldUsePacketFirstIntent,
  type AssistantIntent,
} from "@/lib/ai/intent-router";
import type { SourceSpecificRagKind } from "@/lib/ai/detect-rag-request";

export type TimeoutResult = {
  timedOut: true;
  error: string;
};

export function isTimeoutResult<T>(value: T | TimeoutResult): value is TimeoutResult {
  return typeof value === "object" && value !== null && "timedOut" in value;
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  error: string,
): Promise<T | TimeoutResult> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve({ timedOut: true, error });
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

const INTENT_VALUES = [
  "target_briefing",
  "latest_status",
  "risk_review",
  "financial_analysis",
  "change_management_review",
  "decision_lookup",
  "task_followup",
  "source_lookup",
  "strategy_brainstorm",
  "implementation_planning",
  "app_help",
  "general_conversation",
] as const satisfies readonly AssistantIntent[];

const intentPlannerSchema = z.object({
  intent: z.enum(INTENT_VALUES),
  confidence: z.enum(["high", "medium", "low"]),
  responseMode: z.enum([
    "answer_directly",
    "retrieve_sources",
    "build_project_packet",
    "draft_safe_action",
    "ask_clarifying_question",
    "explain_app_workflow",
  ]),
  requiredTools: z.array(z.string()).max(8),
  shouldAskClarifyingQuestion: z.boolean(),
  rationale: z.string().max(400),
});

export type IntentPlannerDecision = z.infer<typeof intentPlannerSchema> & {
  planner: "model" | "deterministic_fallback";
  deterministicIntent: AssistantIntent;
};

export async function planAssistantIntent(params: {
  message: string;
  selectedProjectId?: number;
  activeModel: string;
  deterministicIntent: AssistantIntent;
  sourceSpecificRagKind?: SourceSpecificRagKind;
}): Promise<IntentPlannerDecision> {
  const fallback: IntentPlannerDecision = {
    planner: "deterministic_fallback",
    deterministicIntent: params.deterministicIntent,
    intent: params.deterministicIntent,
    confidence: "low",
    responseMode:
      params.deterministicIntent === "source_lookup"
        ? "retrieve_sources"
        : shouldUsePacketFirstIntent(params.deterministicIntent)
          ? "build_project_packet"
          : params.deterministicIntent === "app_help"
            ? "explain_app_workflow"
            : "answer_directly",
    requiredTools: [],
    shouldAskClarifyingQuestion: false,
    rationale: "Model planner unavailable; using deterministic fallback intent.",
  };

  if (!params.message.trim()) return fallback;

  const result = await withTimeout(
    generateObject({
      model: getLanguageModel(params.activeModel),
      schema: intentPlannerSchema,
      system: [
        "You are the intent planner for a construction project-management AI assistant.",
        "Classify the user's real goal before any response is drafted.",
        "Choose the route that will make the assistant feel like a thoughtful advisor, not a tool dispatcher.",
        "If the user asks for exact evidence, messages, Teams, email, transcript, or document context, choose source_lookup.",
        "If the user asks for current project state, risks, money, changes, decisions, or follow-ups, choose the matching project-intelligence intent.",
        "If the user asks how to use the app, choose app_help.",
        "If they ask to create or draft an operational record, choose the domain intent and responseMode draft_safe_action.",
        "Do not answer the user. Return only the structured planning object.",
      ].join("\n"),
      prompt: [
        `User message: ${params.message}`,
        `Selected project id: ${params.selectedProjectId ?? "none"}`,
        `Deterministic fallback intent: ${params.deterministicIntent}`,
        `Source-specific RAG kind: ${params.sourceSpecificRagKind ?? "none"}`,
      ].join("\n"),
      experimental_telemetry: {
        isEnabled: process.env.PHOENIX_TRACING === "true",
        functionId: "intent-planner",
        metadata: { modelId: params.activeModel },
      },
    }),
    7000,
    "intent planner timed out",
  );

  if (isTimeoutResult(result)) return fallback;

  return {
    ...result.object,
    planner: "model",
    deterministicIntent: params.deterministicIntent,
  };
}
