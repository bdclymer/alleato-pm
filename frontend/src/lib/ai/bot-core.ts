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
  buildMemoryContextPayload,
} from "@/lib/ai/services/ai-memory-service";
import { extractAndStoreMemories } from "@/lib/ai/services/memory-extraction";
import {
  buildAgentLearningContextBlock,
  getRelevantAgentLearnings,
  type AgentLearningUsageSummary,
} from "@/lib/ai/services/agent-learning-service";
import {
  buildTaskGenerationTrainingBlock,
  shouldLoadTaskTrainingContext,
} from "@/lib/ai/services/task-training-service";
import {
  listArtifacts,
  buildWorkspaceContextBlock,
} from "@/lib/ai/services/workspace-artifact-service";
import { createServiceClient } from "@/lib/supabase/service";
import { toSessionUuid } from "@/lib/ai/session-id";

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
  /** Callback for learnings injected into the prompt */
  onLearningUsage?: (usage: BotLearningUsageSummary) => void;
}

export interface MemoryUsageSummary {
  totalUsed: number;
  preferencesUsed: number;
  relevantUsed: number;
  teamUsed: number;
  recentConversationsUsed: number;
  memories: Array<{
    id: string;
    type: string;
    content: string;
  }>;
}

export interface BotLearningUsageSummary extends AgentLearningUsageSummary {}

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
  onMemoryUsage?: (usage: MemoryUsageSummary) => void;
  onLearningUsage?: (usage: BotLearningUsageSummary) => void;
}): Promise<string> {
  const {
    userId,
    messageText,
    selectedProjectId,
    councilMode,
    sessionId,
    isFirstTurn = true,
    onMemoryUsage,
    onLearningUsage,
  } = options;

  let systemPrompt = getStrategistSystemPrompt();
  const contextHealth: string[] = [];

  // Inject user memories
  if (messageText) {
    try {
      const [{ preferences, relevant, team, errors: memoryErrors }, recentSummaries, activeArtifacts] =
        await Promise.all([
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
      if (memoryErrors.length > 0) {
        contextHealth.push(
          `Memory context partially unavailable: ${memoryErrors.join("; ")}`,
        );
      }
      const relevantLearnings = await getRelevantAgentLearnings({
        messageText,
        projectId: selectedProjectId,
        limit: 4,
      });

      const { block: memoryBlock, selected: selectedMemories } =
        buildMemoryContextPayload(preferences, relevant, team);
      const {
        block: learningBlock,
        selected: selectedLearnings,
      } = buildAgentLearningContextBlock(relevantLearnings);
      const usedMemories = selectedMemories
        .slice(0, 12)
        .map((memory) => ({
          id: memory.id,
          type: memory.type,
          content: memory.content,
        }));
      onMemoryUsage?.({
        totalUsed: usedMemories.length,
        preferencesUsed: preferences.length,
        relevantUsed: relevant.length,
        teamUsed: team.length,
        recentConversationsUsed: recentSummaries.length,
        memories: usedMemories,
      });
      onLearningUsage?.({
        totalUsed: selectedLearnings.length,
        learnings: selectedLearnings.map((learning) => ({
          id: learning.id,
          title: learning.title,
          source: learning.source,
          preventionPrompt: learning.prevention_prompt,
        })),
      });
      const recentBlock = buildRecentConversationsBlock(recentSummaries);

      const workspaceBlock = buildWorkspaceContextBlock(activeArtifacts);
      const contextParts = [recentBlock, memoryBlock, learningBlock, workspaceBlock].filter(Boolean);
      if (contextParts.length > 0) {
        systemPrompt = contextParts.join("\n\n") + "\n\n---\n\n" + systemPrompt;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown memory context error";
      contextHealth.push(
        `Memory and learning context could not be loaded: ${message}`,
      );
      onMemoryUsage?.({
        totalUsed: 0,
        preferencesUsed: 0,
        relevantUsed: 0,
        teamUsed: 0,
        recentConversationsUsed: 0,
        memories: [],
      });
      onLearningUsage?.({
        totalUsed: 0,
        learnings: [],
      });
    }
  }

  if (shouldLoadTaskTrainingContext(messageText)) {
    try {
      const taskTrainingBlock = await buildTaskGenerationTrainingBlock({
        projectId: selectedProjectId ?? null,
      });

      if (taskTrainingBlock) {
        systemPrompt = `${taskTrainingBlock}\n\n---\n\n${systemPrompt}`;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown task training error";
      contextHealth.push(
        `Task generation feedback context could not be loaded: ${message}`,
      );
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown project context error";
      contextHealth.push(
        `Pinned project context could not be loaded: ${message}`,
      );
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

  if (contextHealth.length > 0) {
    systemPrompt +=
      "\n\n## Runtime Context Health\n" +
      "Some context providers failed before generation. Do not ignore this. " +
      "If the missing context affects the answer, say what could not be checked, " +
      "what you can still answer from available sources, and what would make the next answer stronger.\n" +
      contextHealth.map((item) => `- ${item}`).join("\n");
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
    onLearningUsage: options.onLearningUsage,
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
    onLearningUsage: options.onLearningUsage,
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
  const sessionUuid = toSessionUuid(params.sessionId);
  const { error } = await (supabase.from("chat_history") as any).insert({
    session_id: sessionUuid,
    user_id: params.userId,
    role: params.role,
    content: params.content,
    ...(params.metadata ? { metadata: params.metadata } : {}),
  });
  if (error) {
    console.error("[persistChatMessage] insert failed", {
      error: error.message,
      code: (error as { code?: string }).code,
      hint: (error as { hint?: string }).hint,
      sessionId: params.sessionId,
      sessionUuid,
      userId: params.userId,
      role: params.role,
      platform: params.metadata?.platform,
    });
    throw new Error(`persistChatMessage failed: ${error.message}`);
  }
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
