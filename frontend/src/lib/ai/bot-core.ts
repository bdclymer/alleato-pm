/**
 * Shared bot core — the AI logic used by both the web UI chat route
 * and external chat platform adapters (Slack, Teams, Telegram).
 *
 * Extracts the common orchestrator setup (system prompt assembly,
 * tool creation, memory injection) so it can be called from any channel.
 */

import { generateText, streamText, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  buildCouncilModePromptInjection,
  createStrategistTools,
  getStrategistSystemPrompt,
  STRATEGIST_MODEL,
} from "@/lib/ai/orchestrator";
import {
  generateConversationMemory,
  getRecentConversationSummaries,
  buildRecentConversationsBlock,
} from "@/lib/ai/services/conversation-memory";
import {
  getMemoriesForSession,
  buildMemoryContextBlock,
} from "@/lib/ai/services/ai-memory-service";
import { extractAndStoreMemories } from "@/lib/ai/services/memory-extraction";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BotCoreOptions {
  /** Supabase user ID — required for tool data scoping */
  userId: string;
  /** The user's message text */
  messageText: string;
  /** Optional session ID for memory persistence */
  sessionId?: string;
  /** Optional selected project context */
  selectedProjectId?: number;
  /** Enable council mode (multi-voice) */
  councilMode?: boolean;
  /** Conversation history as ModelMessages (for multi-turn) */
  conversationHistory?: ModelMessage[];
  /** Trace callback for tool calls */
  onTrace?: (trace: Record<string, unknown>) => void;
}

export interface BotCoreResult {
  /** The generated response text */
  text: string;
  /** Tool calls made during generation */
  toolTrace: Array<Record<string, unknown>>;
  /** Token usage */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

// ---------------------------------------------------------------------------
// System prompt assembly (shared between web UI and bot channels)
// ---------------------------------------------------------------------------

export async function assembleSystemPrompt(options: {
  userId: string;
  messageText: string;
  selectedProjectId?: number;
  councilMode?: boolean;
  sessionId?: string;
  isFirstTurn?: boolean;
}): Promise<string> {
  const {
    userId,
    messageText,
    selectedProjectId,
    councilMode,
    sessionId,
    isFirstTurn = true,
  } = options;

  let systemPrompt = getStrategistSystemPrompt();

  // Inject user memories
  if (messageText) {
    try {
      const [{ preferences, relevant, team }, recentSummaries] =
        await Promise.all([
          getMemoriesForSession({ userId, firstMessage: messageText }),
          isFirstTurn && sessionId
            ? getRecentConversationSummaries(userId, sessionId, 3)
            : Promise.resolve([]),
        ]);

      const memoryBlock = buildMemoryContextBlock(preferences, relevant, team);
      const recentBlock = buildRecentConversationsBlock(recentSummaries);

      const contextParts = [recentBlock, memoryBlock].filter(Boolean);
      if (contextParts.length > 0) {
        systemPrompt = contextParts.join("\n\n") + "\n\n---\n\n" + systemPrompt;
      }
    } catch {
      // Memory injection failure is non-fatal
    }
  }

  // Selected project context
  if (selectedProjectId) {
    try {
      const supabase = createServiceClient();
      const { data: project } = await supabase
        .from("projects")
        .select("name, project_number, phase, client, health_status")
        .eq("id", selectedProjectId)
        .single();

      if (project) {
        const projectLine = [
          project.name,
          project.project_number ? `#${project.project_number}` : null,
          project.phase ? `Phase: ${project.phase}` : null,
          project.client ? `Client: ${project.client}` : null,
          project.health_status ? `Status: ${project.health_status}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

        systemPrompt +=
          `\n\n## Active Project Context\n` +
          `The user has pinned: **${projectLine}**\n` +
          `Assume all project-specific questions refer to this project unless the user explicitly mentions a different one. ` +
          `Skip disambiguation steps and go straight to retrieving data for this project.`;
      }
    } catch {
      // Non-fatal
    }
  }

  // Risk routing override
  if (messageText && isPortfolioRiskQuery(messageText)) {
    systemPrompt +=
      "\n\n## Runtime Risk Routing Override\n" +
      "For THIS request, you MUST call consultCFO before any other tool. " +
      "Then ensure CFO analysis includes getProjectsWithRisks output before final answer.";
  }

  // Council mode
  if (councilMode) {
    systemPrompt += buildCouncilModePromptInjection();
  }

  return systemPrompt;
}

// ---------------------------------------------------------------------------
// Non-streaming generation (for chat platform bots)
// ---------------------------------------------------------------------------

/**
 * Generate a complete response using the C-Suite orchestrator.
 * Used by Slack/Teams/Telegram bots where streaming is handled by Chat SDK.
 */
export async function generateBotResponse(
  options: BotCoreOptions,
): Promise<BotCoreResult> {
  const toolTrace: Array<Record<string, unknown>> = [];

  const tools = createStrategistTools(options.userId, {
    onTrace: (trace) => {
      toolTrace.push(trace);
      options.onTrace?.(trace);
    },
  });

  const systemPrompt = await assembleSystemPrompt({
    userId: options.userId,
    messageText: options.messageText,
    selectedProjectId: options.selectedProjectId,
    councilMode: options.councilMode,
    sessionId: options.sessionId,
    isFirstTurn: !options.conversationHistory?.length,
  });

  const messages: ModelMessage[] = options.conversationHistory?.length
    ? options.conversationHistory
    : [{ role: "user" as const, content: options.messageText }];

  const result = await generateText({
    model: getLanguageModel(STRATEGIST_MODEL),
    system: systemPrompt,
    messages,
    tools: tools as unknown as ToolSet,
    stopWhen: stepCountIs(7),
  });

  const usage = result.usage;

  return {
    text: result.text,
    toolTrace,
    usage: usage
      ? {
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          totalTokens:
            (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Streaming generation (for chat platform bots that support streaming)
// ---------------------------------------------------------------------------

/**
 * Stream a response using the C-Suite orchestrator.
 * Returns an AI SDK streamText result whose fullStream/textStream can be
 * passed directly to Chat SDK's thread.post().
 */
export async function streamBotResponse(options: BotCoreOptions) {
  const toolTrace: Array<Record<string, unknown>> = [];

  const tools = createStrategistTools(options.userId, {
    onTrace: (trace) => {
      toolTrace.push(trace);
      options.onTrace?.(trace);
    },
  });

  const systemPrompt = await assembleSystemPrompt({
    userId: options.userId,
    messageText: options.messageText,
    selectedProjectId: options.selectedProjectId,
    councilMode: options.councilMode,
    sessionId: options.sessionId,
    isFirstTurn: !options.conversationHistory?.length,
  });

  const messages: ModelMessage[] = options.conversationHistory?.length
    ? options.conversationHistory
    : [{ role: "user" as const, content: options.messageText }];

  const result = streamText({
    model: getLanguageModel(STRATEGIST_MODEL),
    system: systemPrompt,
    messages,
    tools: tools as unknown as ToolSet,
    stopWhen: stepCountIs(7),
  });

  return { result, toolTrace };
}

// ---------------------------------------------------------------------------
// Post-response background tasks
// ---------------------------------------------------------------------------

/**
 * Run background memory tasks after a bot response is sent.
 * Call this in a fire-and-forget pattern (e.g., waitUntil).
 */
export async function runPostResponseTasks(
  sessionId: string,
  userId: string,
): Promise<void> {
  try {
    await generateConversationMemory(sessionId, userId);
  } catch (e) {
    console.error("[bot-core][conversation-memory] failed:", e);
  }

  try {
    await extractAndStoreMemories(sessionId, userId);
  } catch (e) {
    console.error("[bot-core][memory-extraction] failed:", e);
  }
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

/**
 * Persist a message to chat_history for memory continuity.
 */
export async function persistChatMessage(params: {
  sessionId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createServiceClient();
  await (supabase.from("chat_history") as any).insert({
    session_id: params.sessionId,
    user_id: params.userId,
    role: params.role,
    content: params.content,
    ...(params.metadata ? { metadata: params.metadata } : {}),
  });
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function isPortfolioRiskQuery(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasRiskLanguage =
    normalized.includes("risk") ||
    normalized.includes("risky") ||
    normalized.includes("at risk") ||
    normalized.includes("critical item") ||
    normalized.includes("critical items") ||
    normalized.includes("exposure");
  const hasPortfolioLanguage =
    normalized.includes("project") ||
    normalized.includes("projects") ||
    normalized.includes("portfolio") ||
    normalized.includes("jobs");
  return hasRiskLanguage && hasPortfolioLanguage;
}
