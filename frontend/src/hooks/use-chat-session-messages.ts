"use client";

import { useCallback, useState } from "react";
import type { UIMessage } from "@ai-sdk/react";
import { apiFetch } from "@/lib/api-client";
import {
  type ChatHistoryMessage,
  dbMessageToUIMessage,
  extractResponseQuality,
  extractSources,
  extractToolTraces,
  extractTraceDiagnostics,
} from "@/components/ai-assistant/chat-history";
import { extractMemoryUsage } from "@/components/ai-assistant/memory-usage-metadata";
import { extractSkillUsage } from "@/components/ai-assistant/skill-usage-metadata";
import type { MemoryUsage } from "@/components/ai-assistant/memory-usage-disclosure";
import type { SkillUsage } from "@/components/ai-assistant/skill-usage-disclosure";
import type { ResponseQuality } from "@/components/ai-assistant/chat-area";
import type {
  AssistantTraceDiagnostics,
  ToolTraceItem,
} from "@/components/ai-assistant/trace-panel";

/**
 * Loads and parses persisted AI-assistant conversation history for a session.
 * Shared by the `/ai` page and the global floating widget so both surfaces
 * reload identical message/metadata state from `/api/ai-assistant/messages`.
 */
export function useChatSessionMessages() {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [toolTracesByMessageId, setToolTracesByMessageId] = useState<
    Record<string, ToolTraceItem[]>
  >({});
  const [sourcesByMessageId, setSourcesByMessageId] = useState<
    Record<string, unknown[]>
  >({});
  const [memoryUsageByMessageId, setMemoryUsageByMessageId] = useState<
    Record<string, MemoryUsage>
  >({});
  const [skillUsageByMessageId, setSkillUsageByMessageId] = useState<
    Record<string, SkillUsage>
  >({});
  const [responseQualityByMessageId, setResponseQualityByMessageId] = useState<
    Record<string, ResponseQuality>
  >({});
  const [traceDiagnosticsByMessageId, setTraceDiagnosticsByMessageId] = useState<
    Record<string, AssistantTraceDiagnostics>
  >({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [loadMessagesError, setLoadMessagesError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setInitialMessages([]);
    setToolTracesByMessageId({});
    setSourcesByMessageId({});
    setMemoryUsageByMessageId({});
    setSkillUsageByMessageId({});
    setResponseQualityByMessageId({});
    setTraceDiagnosticsByMessageId({});
    setLoadMessagesError(null);
  }, []);

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    setIsLoadingMessages(true);
    setLoadMessagesError(null);
    try {
      // Transient network failures (browser "Failed to fetch" — dev server
      // recompiling/restarting, a wifi blip) should self-heal rather than
      // strand the panel on a permanent error. Retry a few times with backoff;
      // only surface the error if every attempt fails.
      const data = await (async () => {
        const maxAttempts = 3;
        let lastError: unknown;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            return await apiFetch<{ messages?: ChatHistoryMessage[] }>(
              `/api/ai-assistant/messages/${sessionId}`,
            );
          } catch (err) {
            lastError = err;
            const isTransient =
              err instanceof TypeError ||
              (err instanceof Error &&
                /failed to fetch|load failed|network/i.test(err.message));
            if (!isTransient || attempt === maxAttempts) throw err;
            await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
          }
        }
        throw lastError;
      })();
      const historyMessages = (data.messages || []) as ChatHistoryMessage[];
      setInitialMessages(historyMessages.map((m) => dbMessageToUIMessage(m)));
      setToolTracesByMessageId(extractToolTraces(historyMessages));
      setSourcesByMessageId(extractSources(historyMessages));
      setMemoryUsageByMessageId(extractMemoryUsage(historyMessages));
      setSkillUsageByMessageId(extractSkillUsage(historyMessages));
      setResponseQualityByMessageId(extractResponseQuality(historyMessages));
      setTraceDiagnosticsByMessageId(extractTraceDiagnostics(historyMessages));
    } catch (error) {
      reset();
      setLoadMessagesError(
        error instanceof Error
          ? `Conversation history could not be loaded: ${error.message}`
          : "Conversation history could not be loaded.",
      );
    } finally {
      setIsLoadingMessages(false);
    }
  }, [reset]);

  return {
    initialMessages,
    toolTracesByMessageId,
    sourcesByMessageId,
    memoryUsageByMessageId,
    skillUsageByMessageId,
    responseQualityByMessageId,
    traceDiagnosticsByMessageId,
    isLoadingMessages,
    loadMessagesError,
    loadSessionMessages,
    reset,
  };
}
