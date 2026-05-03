"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useRagConversations,
  useCreateConversation,
  useRenameConversation,
  useDeleteConversation,
} from "@/hooks/use-rag-conversations";
import { apiFetch } from "@/lib/api-client";
import {
  DEFAULT_AI_ASSISTANT_MODEL,
  type AiAssistantModelId,
} from "@/lib/ai/assistant-models";
import { ConversationSidebar } from "./conversation-sidebar";
import { ChatArea, type ResponseQuality } from "./chat-area";
import type { AssistantTraceDiagnostics, ToolTraceItem } from "./trace-panel";

type PersistedDataPart = {
  type: `data-${string}`;
  id?: string;
  data: unknown;
};

interface ChatHistoryMessage {
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
}

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

function dbMessageToUIMessage(msg: ChatHistoryMessage): UIMessage {
  return {
    id: msg.id,
    role: msg.role as "user" | "assistant",
    parts: [
      ...normalizePersistedDataParts(msg),
      ...(msg.content ? [{ type: "text" as const, text: msg.content }] : []),
    ],
  };
}

function extractToolTraces(
  messages: ChatHistoryMessage[],
): Record<string, ToolTraceItem[]> {
  const tracesByMessageId: Record<string, ToolTraceItem[]> = {};
  messages.forEach((msg) => {
    const traces = msg.metadata?.tool_trace;
    if (Array.isArray(traces) && traces.length > 0) {
      tracesByMessageId[msg.id] = traces;
    }
  });
  return tracesByMessageId;
}

function extractSources(
  messages: ChatHistoryMessage[],
): Record<string, unknown[]> {
  const sourcesByMessageId: Record<string, unknown[]> = {};
  messages.forEach((msg) => {
    if (Array.isArray(msg.sources) && msg.sources.length > 0) {
      sourcesByMessageId[msg.id] = msg.sources;
    }
  });
  return sourcesByMessageId;
}

function extractMemoryUsage(
  messages: ChatHistoryMessage[],
): Record<string, MemoryUsage> {
  const usageByMessageId: Record<string, MemoryUsage> = {};
  messages.forEach((msg) => {
    const usage = msg.metadata?.memory_usage;
    if (usage && typeof usage.totalUsed === "number") {
      usageByMessageId[msg.id] = usage;
    }
  });
  return usageByMessageId;
}

function extractResponseQuality(
  messages: ChatHistoryMessage[],
): Record<string, ResponseQuality> {
  const byMessageId: Record<string, ResponseQuality> = {};
  messages.forEach((msg) => {
    const quality = msg.metadata?.response_quality;
    if (quality) {
      byMessageId[msg.id] = quality;
    }
  });
  return byMessageId;
}

function extractTraceDiagnostics(
  messages: ChatHistoryMessage[],
): Record<string, AssistantTraceDiagnostics> {
  const byMessageId: Record<string, AssistantTraceDiagnostics> = {};
  messages.forEach((msg) => {
    const metadata = msg.metadata;
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
      byMessageId[msg.id] = diagnostics;
    }
  });
  return byMessageId;
}

function ChatWithSession({
  sessionId,
  initialMessages,
  toolTracesByMessageId,
  sourcesByMessageId,
  memoryUsageByMessageId,
  responseQualityByMessageId,
  traceDiagnosticsByMessageId,
  isLoadingMessages,
  pendingFirstMessage,
  pendingFirstFiles,
  councilMode,
  onCouncilModeChange,
  selectedProjectId,
  onProjectChange,
  selectedModel,
  onModelChange,
  onFinishMessage,
}: {
  sessionId: string;
  initialMessages: UIMessage[];
  toolTracesByMessageId: Record<string, ToolTraceItem[]>;
  sourcesByMessageId: Record<string, unknown[]>;
  memoryUsageByMessageId: Record<
    string,
    MemoryUsage
  >;
  responseQualityByMessageId: Record<string, ResponseQuality>;
  traceDiagnosticsByMessageId: Record<string, AssistantTraceDiagnostics>;
  isLoadingMessages: boolean;
  pendingFirstMessage: string | null;
  pendingFirstFiles?: FileList;
  councilMode: boolean;
  onCouncilModeChange: (val: boolean) => void;
  selectedProjectId: number | null;
  onProjectChange: (id: number | null) => void;
  selectedModel: AiAssistantModelId;
  onModelChange: (model: AiAssistantModelId) => void;
  onFinishMessage: (sessionId: string) => void;
}) {
  const [input, setInput] = useState("");
  const [liveStatus, setLiveStatus] = useState<StrategistLiveStatus | null>(null);
  const councilModeRef = useRef(councilMode);
  councilModeRef.current = councilMode;

  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const selectedProjectIdRef = useRef(selectedProjectId);
  selectedProjectIdRef.current = selectedProjectId;
  const selectedModelRef = useRef(selectedModel);
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
    experimental_throttle: 50,
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
            councilMode: councilModeRef.current,
            selectedProjectId: selectedProjectIdRef.current ?? undefined,
            selectedModel: selectedModelRef.current,
          },
        };
      },
    }),
    onFinish: () => {
      setLiveStatus(null);
      onFinishMessage(sessionIdRef.current);
    },
    onData: (part) => {
      if (part.type !== "data-status") return;
      if (isStrategistLiveStatus(part.data)) {
        setLiveStatus(part.data);
      }
    },
  });

  // Auto-send the first message when mounting after conversation creation
  const hasSentFirstMessage = useRef(false);
  useEffect(() => {
    if (pendingFirstMessage && !hasSentFirstMessage.current) {
      hasSentFirstMessage.current = true;
      sendMessage({ text: pendingFirstMessage, files: pendingFirstFiles });
      setInput("");
    }
  }, [pendingFirstFiles, pendingFirstMessage, sendMessage]);

  // Sync initial messages when they change (conversation switch)
  const prevInitialRef = useRef(initialMessages);
  useEffect(() => {
    if (prevInitialRef.current !== initialMessages) {
      prevInitialRef.current = initialMessages;
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

  const isStreaming = status === "submitted" || status === "streaming";

  const handleSubmit = useCallback(
    (message: string, files?: FileList) => {
      if (!message.trim() || isStreaming) return;
      sendMessage({ text: message, files });
      setInput("");
    },
    [sendMessage, isStreaming],
  );

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
      isStreaming={isStreaming}
      input={input}
      sessionId={sessionId}
      councilMode={councilMode}
      onCouncilModeChange={onCouncilModeChange}
      selectedProjectId={selectedProjectId}
      onProjectChange={onProjectChange}
      selectedModel={selectedModel}
      onModelChange={onModelChange}
      onInputChange={setInput}
      onSubmit={handleSubmit}
      onToolApprovalResponse={addToolApprovalResponse}
      onStop={stop}
    />
  );
}

export function RagChatPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const activeSessionId = searchParams?.get("session") ?? null;

  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [pendingFirstMessage, setPendingFirstMessage] = useState<string | null>(
    null,
  );
  const [pendingFirstFiles, setPendingFirstFiles] = useState<FileList | undefined>();
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
  const [responseQualityByMessageId, setResponseQualityByMessageId] = useState<
    Record<string, ResponseQuality>
  >({});
  const [traceDiagnosticsByMessageId, setTraceDiagnosticsByMessageId] = useState<
    Record<string, AssistantTraceDiagnostics>
  >({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [noSessionInput, setNoSessionInput] = useState("");
  const [councilMode, setCouncilMode] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<AiAssistantModelId>(
    DEFAULT_AI_ASSISTANT_MODEL,
  );

  // Conversation CRUD (React Query — unchanged)
  const { data: conversations = [], isLoading: isLoadingConvos } =
    useRagConversations();
  const createConversation = useCreateConversation();
  const renameConversation = useRenameConversation();
  const deleteConversation = useDeleteConversation();

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    setIsLoadingMessages(true);
    try {
      const data = await apiFetch<{ messages?: ChatHistoryMessage[] }>(
        `/api/ai-assistant/messages/${sessionId}`,
      );
      const historyMessages = (data.messages || []) as ChatHistoryMessage[];
      const msgs: UIMessage[] = historyMessages.map((m) => dbMessageToUIMessage(m));
      setInitialMessages(msgs);
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

  // Load messages when session changes
  useEffect(() => {
    const sessionId = activeSessionId;
    if (!sessionId) {
      setInitialMessages([]);
      setToolTracesByMessageId({});
      setSourcesByMessageId({});
      setMemoryUsageByMessageId({});
      setResponseQualityByMessageId({});
      setTraceDiagnosticsByMessageId({});
      return;
    }
    void loadSessionMessages(sessionId);
  }, [activeSessionId, loadSessionMessages]);

  const effectiveSessionId = activeSessionId || pendingSessionId;
  const handleFinishMessage = useCallback((sessionId: string) => {
    queryClient.invalidateQueries({ queryKey: ["rag-conversations"] });
    setPendingSessionId(null);
    setPendingFirstFiles(undefined);
    void loadSessionMessages(sessionId);
  }, [queryClient, loadSessionMessages]);

  const setActiveSession = useCallback(
    (sessionId: string | null) => {
      setPendingSessionId(null);
      setPendingFirstMessage(null);
      setPendingFirstFiles(undefined);
      if (sessionId) {
        router.push(`/ai-assistant?session=${sessionId}`, { scroll: false });
      } else {
        router.push("/ai-assistant", { scroll: false });
      }
    },
    [router],
  );

  const handleNewChat = useCallback(async () => {
    if (createConversation.isPending) return;

    setInitialMessages([]);
    setPendingFirstMessage(null);
    setPendingFirstFiles(undefined);
    setPendingSessionId(null);

    try {
      const result = await createConversation.mutateAsync("New conversation");
      const sessionId = result.session_id;
      setPendingSessionId(sessionId);
      router.push(`/ai-assistant?session=${sessionId}`, { scroll: false });
    } catch {
      setActiveSession(null);
    }
  }, [createConversation, router, setActiveSession]);

  const handleSelectConversation = useCallback(
    (sessionId: string) => {
      setActiveSession(sessionId);
    },
    [setActiveSession],
  );

  const handleRename = useCallback(
    (sessionId: string, title: string) => {
      renameConversation.mutate({ sessionId, title });
    },
    [renameConversation],
  );

  const handleDelete = useCallback(
    (sessionId: string) => {
      deleteConversation.mutate(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSession(null);
      }
    },
    [deleteConversation, activeSessionId, setActiveSession],
  );

  // Handle first message in a new conversation
  const handleFirstMessage = useCallback(
    async (message: string, files?: FileList) => {
      const title = message.substring(0, 50);
      try {
        const result = await createConversation.mutateAsync(title);
        const sessionId = result.session_id;
        setPendingSessionId(sessionId);
        setPendingFirstMessage(message);
        setPendingFirstFiles(files);
        router.push(`/ai-assistant?session=${sessionId}`, { scroll: false });
      } catch {
        // Creation failed — don't proceed
      }
    },
    [createConversation, router],
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
      <ConversationSidebar
        conversations={conversations}
        activeSessionId={effectiveSessionId}
        isLoading={isLoadingConvos}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <div className="min-h-0 flex-1">
        {effectiveSessionId ? (
          <ChatWithSession
            key={effectiveSessionId}
            sessionId={effectiveSessionId}
            initialMessages={initialMessages}
            toolTracesByMessageId={toolTracesByMessageId}
            sourcesByMessageId={sourcesByMessageId}
            memoryUsageByMessageId={memoryUsageByMessageId}
            responseQualityByMessageId={responseQualityByMessageId}
            traceDiagnosticsByMessageId={traceDiagnosticsByMessageId}
            isLoadingMessages={isLoadingMessages}
            pendingFirstMessage={pendingFirstMessage}
            pendingFirstFiles={pendingFirstFiles}
            councilMode={councilMode}
            onCouncilModeChange={setCouncilMode}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
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
            input={noSessionInput}
            councilMode={councilMode}
            onCouncilModeChange={setCouncilMode}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onInputChange={setNoSessionInput}
            onSubmit={(msg: string, files?: FileList) => {
              setNoSessionInput("");
              handleFirstMessage(msg, files);
            }}
            onStop={() => {}}
          />
        )}
      </div>
    </div>
  );
}
