"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type FileUIPart,
} from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquareIcon } from "lucide-react";
import { ConversationSidebar } from "./conversation-sidebar";
import { ChatArea, type ResponseQuality } from "./chat-area";
import type { MemoryUsage } from "./memory-usage-disclosure";
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
    memory_usage?: MemoryUsage;
    response_quality?: ResponseQuality;
    provider_path?: string;
    model?: string;
    provider_decision?: Record<string, unknown> | null;
    loop_diagnostic?: Record<string, unknown> | null;
    data_parts?: PersistedDataPart[];
  } | null;
  created_at: string | null;
}

type StrategistLiveStatus = {
  stage: string;
  message: string;
  status: "loading" | "success" | "warning" | "error";
  timestamp?: string;
};

function formatChatError(error: Error): string {
  const message = error.message?.trim();
  if (!message) {
    return "The assistant request failed before a response was returned.";
  }
  return `The assistant request failed before a response was returned: ${message}`;
}

function isStrategistLiveStatus(value: unknown): value is StrategistLiveStatus {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.message === "string" && typeof record.stage === "string";
}

function stripStatusParts(messages: UIMessage[]): UIMessage[] {
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
  loadMessagesError,
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
  loadMessagesError: string | null;
  pendingFirstMessage: string | null;
  pendingFirstFiles?: FileUIPart[];
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

  // Tracks whether to skip the next initialMessages → setMessages sync.
  // Set true in onFinish so that the post-stream DB reload doesn't replace
  // the correct live useChat messages with the freshly-fetched DB copy.
  const skipNextMessagesSync = useRef(false);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    addToolApprovalResponse,
    error,
  } = useChat({
    id: sessionId,
    messages: initialMessages,
    experimental_throttle: 50,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    transport: new DefaultChatTransport({
      api: "/api/ai-assistant/chat",
      prepareSendMessagesRequest(request) {
        const cleanedMessages = stripStatusParts(request.messages);
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
      skipNextMessagesSync.current = true;
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

  // Sync initial messages when they change (conversation switch).
  // Skip when skipNextMessagesSync is set — see ref declaration above.
  const prevInitialRef = useRef(initialMessages);
  useEffect(() => {
    if (prevInitialRef.current !== initialMessages) {
      prevInitialRef.current = initialMessages;
      if (!skipNextMessagesSync.current) {
        setMessages(initialMessages);
      }
      skipNextMessagesSync.current = false;
    }
  }, [initialMessages, setMessages]);

  const isStreaming = status === "submitted" || status === "streaming";

  // Show the pending first message as an optimistic bubble while useChat's
  // messages array is still empty (before sendMessage fires in useEffect).
  // Prevents the welcome screen from flashing during new-session creation.
  const displayMessages = useMemo<UIMessage[]>(() => {
    if (pendingFirstMessage && messages.length === 0) {
      return [{
        id: "pending-first-message",
        role: "user" as const,
        parts: [{ type: "text" as const, text: pendingFirstMessage }],
      }];
    }
    return messages;
  }, [pendingFirstMessage, messages]);

  const handleSubmit = useCallback(
    (message: string, files?: FileUIPart[]) => {
      if (!message.trim() || isStreaming) return;
      sendMessage({ text: message, files });
      setInput("");
    },
    [sendMessage, isStreaming],
  );

  return (
    <ChatArea
      messages={displayMessages}
      toolTracesByMessageId={toolTracesByMessageId}
      sourcesByMessageId={sourcesByMessageId}
      memoryUsageByMessageId={memoryUsageByMessageId}
      responseQualityByMessageId={responseQualityByMessageId}
      traceDiagnosticsByMessageId={traceDiagnosticsByMessageId}
      liveStatus={liveStatus}
      chatError={error ? formatChatError(error) : loadMessagesError}
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
  const searchParams = useSearchParams()!;
  const activeSessionId = searchParams?.get("session") ?? null;
  const projectIdParam = searchParams?.get("projectId") ?? null;
  const initialProjectId = projectIdParam ? Number(projectIdParam) : null;

  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [pendingFirstMessage, setPendingFirstMessage] = useState<string | null>(
    null,
  );
  const [pendingFirstFiles, setPendingFirstFiles] = useState<FileUIPart[] | undefined>();
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
  const [loadMessagesError, setLoadMessagesError] = useState<string | null>(null);
  const [noSessionInput, setNoSessionInput] = useState("");
  // Optimistic user message shown while a new conversation is being created
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null);
  // Tracks the last effective session id so we only clear the optimistic message once per session transition
  const prevEffectiveSessionIdRef = useRef<string | null>(null);
  const [councilMode, setCouncilMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    Number.isFinite(initialProjectId) ? initialProjectId : null,
  );
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
            // A "Failed to fetch" TypeError means no HTTP response arrived
            // (transport-level). HTTP errors come back as ApiError with a
            // status and are not worth retrying here.
            const isTransient =
              err instanceof TypeError ||
              (err instanceof Error && /failed to fetch|load failed|network/i.test(err.message));
            if (!isTransient || attempt === maxAttempts) throw err;
            await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
          }
        }
        throw lastError;
      })();
      const historyMessages = (data.messages || []) as ChatHistoryMessage[];
      const msgs: UIMessage[] = historyMessages.map((m) => dbMessageToUIMessage(m));
      setInitialMessages(msgs);
      setToolTracesByMessageId(extractToolTraces(historyMessages));
      setSourcesByMessageId(extractSources(historyMessages));
      setMemoryUsageByMessageId(extractMemoryUsage(historyMessages));
      setResponseQualityByMessageId(extractResponseQuality(historyMessages));
      setTraceDiagnosticsByMessageId(extractTraceDiagnostics(historyMessages));
    } catch (error) {
      setInitialMessages([]);
      setToolTracesByMessageId({});
      setSourcesByMessageId({});
      setMemoryUsageByMessageId({});
      setResponseQualityByMessageId({});
      setTraceDiagnosticsByMessageId({});
      setLoadMessagesError(
        error instanceof Error
          ? `Conversation history could not be loaded: ${error.message}`
          : "Conversation history could not be loaded.",
      );
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
      setLoadMessagesError(null);
      return;
    }
    // Skip fetching for a session we just created and haven't sent to yet.
    // The session is empty — fetching would return [] and wipe the live
    // streaming messages via the ChatWithSession sync effect.
    if (pendingSessionId === sessionId && pendingFirstMessage !== null) return;
    void loadSessionMessages(sessionId);
  }, [activeSessionId, loadSessionMessages, pendingSessionId, pendingFirstMessage]);

  const effectiveSessionId = activeSessionId || pendingSessionId;

  // Clear optimistic message once ChatWithSession takes over so it doesn't double-render
  useEffect(() => {
    if (effectiveSessionId && effectiveSessionId !== prevEffectiveSessionIdRef.current) {
      prevEffectiveSessionIdRef.current = effectiveSessionId;
      setOptimisticUserMessage(null);
    }
  }, [effectiveSessionId]);
  const handleFinishMessage = useCallback((sessionId: string) => {
    queryClient.invalidateQueries({ queryKey: ["rag-conversations"] });
    setPendingSessionId(null);
    setPendingFirstMessage(null);
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
    setLoadMessagesError(null);
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
    async (message: string, files?: FileUIPart[]) => {
      // Show the user message immediately — don't wait for the API call
      setOptimisticUserMessage(message);
      const title = message.substring(0, 50);
      try {
        const result = await createConversation.mutateAsync(title);
        const sessionId = result.session_id;
        setPendingSessionId(sessionId);
        setPendingFirstMessage(message);
        setPendingFirstFiles(files);
        router.push(`/ai-assistant?session=${sessionId}`, { scroll: false });
      } catch {
        // Creation failed — clear the optimistic message
        setOptimisticUserMessage(null);
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
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <div className="fixed right-4 top-14 z-30 sm:right-10 sm:top-20">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-muted/50 text-foreground shadow-none hover:bg-muted"
              onClick={() => setHistoryOpen(true)}
            >
              <MessageSquareIcon className="h-4 w-4" />
              <span className="sr-only">Chat history</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>Chat history</TooltipContent>
        </Tooltip>
      </div>
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
            loadMessagesError={loadMessagesError}
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
            messages={
              optimisticUserMessage
                ? [
                    {
                      id: "optimistic-user",
                      role: "user" as const,
                      parts: [{ type: "text" as const, text: optimisticUserMessage }],
                    },
                  ]
                : []
            }
            toolTracesByMessageId={{}}
            responseQualityByMessageId={{}}
            traceDiagnosticsByMessageId={{}}
            liveStatus={null}
            chatError={loadMessagesError}
            isLoadingMessages={false}
            isStreaming={createConversation.isPending}
            input={noSessionInput}
            councilMode={councilMode}
            onCouncilModeChange={setCouncilMode}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onInputChange={setNoSessionInput}
            onSubmit={(msg: string, files?: FileUIPart[]) => {
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
