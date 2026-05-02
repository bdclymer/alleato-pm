"use client";

import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SparkleIcon } from "lucide-react";
import { SectionRuleHeading } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ChatArea, type ResponseQuality } from "@/components/ai-assistant/chat-area";
import type { AssistantTraceDiagnostics, ToolTraceItem } from "@/components/ai-assistant/trace-panel";
import { apiFetch } from "@/lib/api-client";
import {
  DEFAULT_AI_ASSISTANT_MODEL,
  type AiAssistantModelId,
} from "@/lib/ai/assistant-models";
import type { BrandonDailyUpdatePacket } from "@/lib/executive/brandon-daily-update";

type PersistedDataPart = {
  type: `data-${string}`;
  id?: string;
  data: unknown;
};

type ChatHistoryMessage = {
  id: string;
  role: string;
  content: string;
  sources: unknown[] | null;
  metadata?: {
    tool_trace?: ToolTraceItem[];
    memory_usage?: {
      totalUsed: number;
      preferencesUsed?: number;
      relevantUsed?: number;
      teamUsed?: number;
      recentConversationsUsed?: number;
      memories?: Array<{
        id: string;
        type: string;
        content: string;
      }>;
    };
    response_quality?: ResponseQuality;
    provider_path?: string;
    model?: string;
    provider_decision?: Record<string, unknown> | null;
    loop_diagnostic?: Record<string, unknown> | null;
    data_parts?: PersistedDataPart[];
  } | null;
  created_at: string | null;
};

type MemoryUsage = NonNullable<
  NonNullable<ChatHistoryMessage["metadata"]>["memory_usage"]
>;

type StrategistLiveStatus = {
  stage: string;
  message: string;
  status: "loading" | "success" | "warning" | "error";
  timestamp?: string;
};

function isStrategistLiveStatus(value: unknown): value is StrategistLiveStatus {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.message === "string" && typeof record.stage === "string";
}

function stripRuntimeDataParts(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.filter((part) => !part.type.startsWith("data-")),
  }));
}

function normalizePersistedDataParts(message: ChatHistoryMessage): PersistedDataPart[] {
  const parts = message.metadata?.data_parts;
  if (!Array.isArray(parts)) return [];

  return parts.filter((part): part is PersistedDataPart => {
    if (!part || typeof part !== "object") return false;
    const record = part as Record<string, unknown>;
    return typeof record.type === "string" && record.type.startsWith("data-");
  });
}

function dbMessageToUIMessage(message: ChatHistoryMessage): UIMessage {
  return {
    id: message.id,
    role: message.role as "user" | "assistant",
    parts: [
      ...normalizePersistedDataParts(message),
      ...(message.content ? [{ type: "text" as const, text: message.content }] : []),
    ],
  };
}

function extractToolTraces(
  messages: ChatHistoryMessage[],
): Record<string, ToolTraceItem[]> {
  const tracesByMessageId: Record<string, ToolTraceItem[]> = {};
  messages.forEach((message) => {
    const traces = message.metadata?.tool_trace;
    if (Array.isArray(traces) && traces.length > 0) {
      tracesByMessageId[message.id] = traces;
    }
  });
  return tracesByMessageId;
}

function extractSources(
  messages: ChatHistoryMessage[],
): Record<string, unknown[]> {
  const byMessageId: Record<string, unknown[]> = {};
  messages.forEach((message) => {
    if (Array.isArray(message.sources) && message.sources.length > 0) {
      byMessageId[message.id] = message.sources;
    }
  });
  return byMessageId;
}

function extractMemoryUsage(
  messages: ChatHistoryMessage[],
): Record<string, MemoryUsage> {
  const byMessageId: Record<string, MemoryUsage> = {};
  messages.forEach((message) => {
    const usage = message.metadata?.memory_usage;
    if (usage && typeof usage.totalUsed === "number") {
      byMessageId[message.id] = usage;
    }
  });
  return byMessageId;
}

function extractResponseQuality(
  messages: ChatHistoryMessage[],
): Record<string, ResponseQuality> {
  const byMessageId: Record<string, ResponseQuality> = {};
  messages.forEach((message) => {
    const quality = message.metadata?.response_quality;
    if (quality) {
      byMessageId[message.id] = quality;
    }
  });
  return byMessageId;
}

function extractTraceDiagnostics(
  messages: ChatHistoryMessage[],
): Record<string, AssistantTraceDiagnostics> {
  const byMessageId: Record<string, AssistantTraceDiagnostics> = {};
  messages.forEach((message) => {
    const metadata = message.metadata;
    if (!metadata) return;

    const diagnostics: AssistantTraceDiagnostics = {
      providerPath: metadata.provider_path ?? null,
      model: metadata.model ?? null,
      providerDecision: metadata.provider_decision ?? null,
      loopDiagnostic: metadata.loop_diagnostic ?? null,
    };

    if (
      diagnostics.providerPath ||
      diagnostics.model ||
      diagnostics.providerDecision ||
      diagnostics.loopDiagnostic
    ) {
      byMessageId[message.id] = diagnostics;
    }
  });
  return byMessageId;
}

const STARTER_PROMPTS = [
  "What are the three highest-risk items Brandon should act on today?",
  "Turn the most important executive items into a follow-up plan with owners and due dates.",
  "Where is the biggest financial or compliance exposure in this brief?",
];

function ExecutiveChatSession({
  sessionId,
  packet,
  initialMessages,
  toolTracesByMessageId,
  sourcesByMessageId,
  memoryUsageByMessageId,
  responseQualityByMessageId,
  traceDiagnosticsByMessageId,
  isLoadingMessages,
  pendingFirstMessage,
  queuedPrompt,
  selectedModel,
  onModelChange,
  onFinishMessage,
}: {
  sessionId: string;
  packet: BrandonDailyUpdatePacket;
  initialMessages: UIMessage[];
  toolTracesByMessageId: Record<string, ToolTraceItem[]>;
  sourcesByMessageId: Record<string, unknown[]>;
  memoryUsageByMessageId: Record<string, MemoryUsage>;
  responseQualityByMessageId: Record<string, ResponseQuality>;
  traceDiagnosticsByMessageId: Record<string, AssistantTraceDiagnostics>;
  isLoadingMessages: boolean;
  pendingFirstMessage: string | null;
  queuedPrompt: { id: string; text: string } | null;
  selectedModel: AiAssistantModelId;
  onModelChange: (model: AiAssistantModelId) => void;
  onFinishMessage: (sessionId: string) => void;
}) {
  const [input, setInput] = useState("");
  const [liveStatus, setLiveStatus] = useState<StrategistLiveStatus | null>(null);
  const hasSentFirstMessage = useRef(false);
  const lastQueuedPromptId = useRef<string | null>(null);
  const sessionIdRef = useRef(sessionId);
  const selectedModelRef = useRef(selectedModel);

  sessionIdRef.current = sessionId;
  selectedModelRef.current = selectedModel;

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    addToolApprovalResponse,
  } = useChat({
    id: sessionId,
    messages: initialMessages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    transport: new DefaultChatTransport({
      api: "/api/ai-assistant/chat",
      prepareSendMessagesRequest(request) {
        const cleanedMessages = stripRuntimeDataParts(request.messages);
        const lastMessage = cleanedMessages.at(-1);

        return {
          body: {
            id: sessionIdRef.current,
            message: lastMessage,
            messages: cleanedMessages,
            selectedModel: selectedModelRef.current,
            executiveBriefPacket: packet,
          },
        };
      },
    }),
    onData: ({ data, type }) => {
      if (type !== "data-status") return;
      if (isStrategistLiveStatus(data)) {
        setLiveStatus(data);
      }
    },
    onFinish() {
      setLiveStatus(null);
      onFinishMessage(sessionIdRef.current);
    },
    onError(error) {
      setLiveStatus({
        stage: "fallback",
        message: error.message,
        status: "error",
        timestamp: new Date().toISOString(),
      });
    },
  });

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, setMessages]);

  useEffect(() => {
    if (pendingFirstMessage && !hasSentFirstMessage.current) {
      hasSentFirstMessage.current = true;
      sendMessage({ text: pendingFirstMessage });
    }
  }, [pendingFirstMessage, sendMessage]);

  useEffect(() => {
    if (!queuedPrompt) return;
    if (queuedPrompt.id === lastQueuedPromptId.current) return;
    if (!hasSentFirstMessage.current && pendingFirstMessage) return;

    lastQueuedPromptId.current = queuedPrompt.id;
    sendMessage({ text: queuedPrompt.text });
  }, [pendingFirstMessage, queuedPrompt, sendMessage]);

  return (
    <ChatArea
      messages={messages}
      toolTracesByMessageId={toolTracesByMessageId}
      sourcesByMessageId={sourcesByMessageId}
      memoryUsageByMessageId={memoryUsageByMessageId}
      responseQualityByMessageId={responseQualityByMessageId}
      traceDiagnosticsByMessageId={traceDiagnosticsByMessageId}
      liveStatus={liveStatus}
      isLoadingMessages={isLoadingMessages}
      isStreaming={status === "streaming" || status === "submitted"}
      input={input}
      sessionId={sessionId}
      selectedModel={selectedModel}
      onModelChange={onModelChange}
      onInputChange={setInput}
      onSubmit={(message, files) => sendMessage({ text: message, files })}
      onToolApprovalResponse={addToolApprovalResponse}
      onStop={stop}
    />
  );
}

export function ExecutiveChatPanel({
  packet,
}: {
  packet: BrandonDailyUpdatePacket;
}) {
  const [draftInput, setDraftInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [toolTracesByMessageId, setToolTracesByMessageId] = useState<
    Record<string, ToolTraceItem[]>
  >({});
  const [sourcesByMessageId, setSourcesByMessageId] = useState<Record<string, unknown[]>>(
    {},
  );
  const [memoryUsageByMessageId, setMemoryUsageByMessageId] = useState<
    Record<string, MemoryUsage>
  >({});
  const [responseQualityByMessageId, setResponseQualityByMessageId] = useState<
    Record<string, ResponseQuality>
  >({});
  const [traceDiagnosticsByMessageId, setTraceDiagnosticsByMessageId] = useState<
    Record<string, AssistantTraceDiagnostics>
  >({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [pendingFirstMessage, setPendingFirstMessage] = useState<string | null>(null);
  const [queuedPrompt, setQueuedPrompt] = useState<{ id: string; text: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState<AiAssistantModelId>(
    DEFAULT_AI_ASSISTANT_MODEL,
  );

  const loadSessionMessages = useCallback(async (targetSessionId: string) => {
    setIsLoadingMessages(true);

    try {
      const data = await apiFetch<{ messages?: ChatHistoryMessage[] }>(
        `/api/ai-assistant/messages/${targetSessionId}`,
      );
      const historyMessages = (data.messages ?? []) as ChatHistoryMessage[];
      setInitialMessages(historyMessages.map((message) => dbMessageToUIMessage(message)));
      setToolTracesByMessageId(extractToolTraces(historyMessages));
      setSourcesByMessageId(extractSources(historyMessages));
      setMemoryUsageByMessageId(extractMemoryUsage(historyMessages));
      setResponseQualityByMessageId(extractResponseQuality(historyMessages));
      setTraceDiagnosticsByMessageId(extractTraceDiagnostics(historyMessages));
    } catch {
      setInitialMessages([]);
      setToolTracesByMessageId({});
      setSourcesByMessageId({});
      setMemoryUsageByMessageId({});
      setResponseQualityByMessageId({});
      setTraceDiagnosticsByMessageId({});
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const createConversation = useCallback(async () => {
    const data = await apiFetch<{
      conversation: {
        session_id: string;
      };
    }>("/api/ai-assistant/conversations", {
      method: "POST",
      body: JSON.stringify({
        title: `Executive brief — ${new Date(packet.generatedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`,
        metadata: {
          origin: "executive-brief",
          packetGeneratedAt: packet.generatedAt,
          packetWindowDays: packet.windowDays,
        },
      }),
    });

    return data.conversation.session_id;
  }, [packet.generatedAt, packet.windowDays]);

  const handlePrompt = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      if (sessionId) {
        setQueuedPrompt({
          id: `${Date.now()}:${trimmed}`,
          text: trimmed,
        });
        return;
      }

      const newSessionId = await createConversation();
      setSessionId(newSessionId);
      setPendingFirstMessage(trimmed);
      setDraftInput("");
    },
    [createConversation, sessionId],
  );

  const handleFinishMessage = useCallback(
    (targetSessionId: string) => {
      setPendingFirstMessage(null);
      setQueuedPrompt(null);
      void loadSessionMessages(targetSessionId);
    },
    [loadSessionMessages],
  );

  useEffect(() => {
    if (!sessionId) return;
    void loadSessionMessages(sessionId);
  }, [loadSessionMessages, sessionId]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <SparkleIcon className="h-3.5 w-3.5" />
            Executive chat
          </div>
          <SectionRuleHeading
            label="Ask for deeper analysis without losing the current brief context."
            className="mb-0 pb-0"
          />
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            This assistant is grounded in the latest executive packet on this page. Use it to ask
            follow-up questions, pressure-test priorities, or draft follow-through.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => void handlePrompt(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>

      <div className="min-h-96 overflow-hidden rounded-2xl border border-border bg-background">
        {sessionId ? (
          <ExecutiveChatSession
            key={sessionId}
            sessionId={sessionId}
            packet={packet}
            initialMessages={initialMessages}
            toolTracesByMessageId={toolTracesByMessageId}
            sourcesByMessageId={sourcesByMessageId}
            memoryUsageByMessageId={memoryUsageByMessageId}
            responseQualityByMessageId={responseQualityByMessageId}
            traceDiagnosticsByMessageId={traceDiagnosticsByMessageId}
            isLoadingMessages={isLoadingMessages}
            pendingFirstMessage={pendingFirstMessage}
            queuedPrompt={queuedPrompt}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onFinishMessage={handleFinishMessage}
          />
        ) : (
          <ChatArea
            messages={[]}
            toolTracesByMessageId={{}}
            responseQualityByMessageId={{}}
            traceDiagnosticsByMessageId={{}}
            liveStatus={null}
            isLoadingMessages={false}
            isStreaming={false}
            input={draftInput}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onInputChange={setDraftInput}
            onSubmit={(message) => {
              void handlePrompt(message);
            }}
            onStop={() => {}}
          />
        )}
      </div>
    </section>
  );
}
