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
  "task_write",
  "email_action",
  "calendar_action",
  "external_research",
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

function shouldPreferDeterministicIntent(
  deterministicIntent: AssistantIntent,
  modelIntent: AssistantIntent,
): boolean {
  if (deterministicIntent === "general_conversation") return false;
  if (deterministicIntent === modelIntent) return false;

  // High-signal local rules are safer than a vague model planner downgrade.
  // These downgrades are especially damaging because they skip the packet/tool
  // routes and make the assistant answer like a generic chatbot.
  return (
    modelIntent === "general_conversation" ||
    (modelIntent === "task_followup" && deterministicIntent !== "task_followup") ||
    (modelIntent === "strategy_brainstorm" && deterministicIntent === "implementation_planning") ||
    deterministicIntent === "task_write" ||
    deterministicIntent === "email_action" ||
    deterministicIntent === "calendar_action"
  );
}

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
      params.deterministicIntent === "task_write"
        ? "draft_safe_action"
        : params.deterministicIntent === "email_action"
        ? "draft_safe_action"
        : params.deterministicIntent === "calendar_action"
        ? "draft_safe_action"
        : params.deterministicIntent === "source_lookup"
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
        "CRITICAL: If the user says anything like 'remind me to', 'add a task', 'create a task', 'note for myself', 'flag for follow-up', 'throw this on my list', 'put this on my list', 'log that I need to', 'action item:', 'get someone on [X]', 'assign this to', or any phrasing that implies WRITING a task or action item — choose task_write with responseMode draft_safe_action. Do NOT choose task_followup for these — task_followup is for READING existing tasks, task_write is for CREATING new ones.",
        "If the user asks to draft, write, prepare, compose, or respond to an email or Outlook message, choose email_action with responseMode draft_safe_action. The assistant must preview first and never send email directly.",
        "If the user explicitly asks for web search, live web, internet/online sources, current external requirements, regulations, zoning, ordinances, PUD/planned unit development requirements, market conditions, competitors, or company research, choose external_research. Do NOT choose source_lookup just because they also ask to cite sources.",
        "If the user asks for exact evidence, messages, Teams, email, transcript, or document context from Alleato/internal records, choose source_lookup.",
        "If the user asks for current project state, risks, money, changes, decisions, or follow-ups (reading), choose the matching project-intelligence intent.",
        "If the user asks how to use the app, choose app_help.",
        "If they ask to create or draft an operational record other than a task (RFI, commitment, company), choose the domain intent and responseMode draft_safe_action.",
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

  if (
    shouldPreferDeterministicIntent(
      params.deterministicIntent,
      result.object.intent,
    )
  ) {
    return {
      ...fallback,
      confidence: "medium",
      rationale: `Deterministic intent '${params.deterministicIntent}' overrode model planner intent '${result.object.intent}' to prevent routing downgrade.`,
    };
  }

  return {
    ...result.object,
    planner: "model",
    deterministicIntent: params.deterministicIntent,
  };
}
