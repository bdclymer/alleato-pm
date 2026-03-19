"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useRagConversations,
  useCreateConversation,
  useRenameConversation,
  useDeleteConversation,
} from "@/hooks/use-rag-conversations";
import { ConversationSidebar } from "./conversation-sidebar";
import { ChatArea } from "./chat-area";
import type { ToolTraceItem } from "./trace-panel";

interface ChatHistoryMessage {
  id: string;
  role: string;
  content: string;
  sources: unknown[] | null;
  metadata?: {
    tool_trace?: ToolTraceItem[];
  } | null;
  created_at: string | null;
}

function dbMessageToUIMessage(msg: ChatHistoryMessage): UIMessage {
  return {
    id: msg.id,
    role: msg.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: msg.content }],
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

function ChatWithSession({
  sessionId,
  initialMessages,
  toolTracesByMessageId,
  sourcesByMessageId,
  isLoadingMessages,
  pendingFirstMessage,
  councilMode,
  onCouncilModeChange,
  selectedProjectId,
  onProjectChange,
  onFinishMessage,
}: {
  sessionId: string;
  initialMessages: UIMessage[];
  toolTracesByMessageId: Record<string, ToolTraceItem[]>;
  sourcesByMessageId: Record<string, unknown[]>;
  isLoadingMessages: boolean;
  pendingFirstMessage: string | null;
  councilMode: boolean;
  onCouncilModeChange: (val: boolean) => void;
  selectedProjectId: number | null;
  onProjectChange: (id: number | null) => void;
  onFinishMessage: (sessionId: string) => void;
}) {
  const [input, setInput] = useState(pendingFirstMessage ?? "");
  const councilModeRef = useRef(councilMode);
  councilModeRef.current = councilMode;

  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const selectedProjectIdRef = useRef(selectedProjectId);
  selectedProjectIdRef.current = selectedProjectId;

  const { messages, setMessages, sendMessage, status, stop } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/ai-assistant/chat",
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);
        return {
          body: {
            id: sessionIdRef.current,
            message: lastMessage,
            messages: request.messages,
            councilMode: councilModeRef.current,
            selectedProjectId: selectedProjectIdRef.current ?? undefined,
          },
        };
      },
    }),
    onFinish: () => {
      onFinishMessage(sessionIdRef.current);
    },
  });

  // Auto-send the first message when mounting after conversation creation
  const hasSentFirstMessage = useRef(false);
  useEffect(() => {
    if (pendingFirstMessage && !hasSentFirstMessage.current) {
      hasSentFirstMessage.current = true;
      sendMessage({ text: pendingFirstMessage });
      setInput("");
    }
  }, [pendingFirstMessage, sendMessage]);

  // Sync initial messages when they change (conversation switch)
  const prevInitialRef = useRef(initialMessages);
  useEffect(() => {
    if (prevInitialRef.current !== initialMessages) {
      prevInitialRef.current = initialMessages;
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

  const isStreaming = status === "streaming";

  const handleSubmit = useCallback(
    (message: string) => {
      if (!message.trim() || isStreaming) return;
      sendMessage({ text: message });
      setInput("");
    },
    [sendMessage, isStreaming],
  );

  return (
    <ChatArea
      messages={messages}
      toolTracesByMessageId={toolTracesByMessageId}
      sourcesByMessageId={sourcesByMessageId}
      isLoadingMessages={isLoadingMessages}
      isStreaming={isStreaming}
      input={input}
      sessionId={sessionId}
      councilMode={councilMode}
      onCouncilModeChange={onCouncilModeChange}
      selectedProjectId={selectedProjectId}
      onProjectChange={onProjectChange}
      onInputChange={setInput}
      onSubmit={handleSubmit}
      onStop={stop}
    />
  );
}

export function RagChatPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const activeSessionId = searchParams.get("session");

  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [pendingFirstMessage, setPendingFirstMessage] = useState<string | null>(
    null,
  );
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [toolTracesByMessageId, setToolTracesByMessageId] = useState<
    Record<string, ToolTraceItem[]>
  >({});
  const [sourcesByMessageId, setSourcesByMessageId] = useState<
    Record<string, unknown[]>
  >({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [noSessionInput, setNoSessionInput] = useState("");
  const [councilMode, setCouncilMode] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Conversation CRUD (React Query — unchanged)
  const { data: conversations = [], isLoading: isLoadingConvos } =
    useRagConversations();
  const createConversation = useCreateConversation();
  const renameConversation = useRenameConversation();
  const deleteConversation = useDeleteConversation();

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/ai-assistant/messages/${sessionId}`);
      const data = await res.json();
      const historyMessages = (data.messages || []) as ChatHistoryMessage[];
      const msgs: UIMessage[] = historyMessages.map((m) => dbMessageToUIMessage(m));
      setInitialMessages(msgs);
      setToolTracesByMessageId(extractToolTraces(historyMessages));
      setSourcesByMessageId(extractSources(historyMessages));
    } catch {
      setInitialMessages([]);
      setToolTracesByMessageId({});
      setSourcesByMessageId({});
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
      return;
    }
    void loadSessionMessages(sessionId);
  }, [activeSessionId, loadSessionMessages]);

  const effectiveSessionId = activeSessionId || pendingSessionId;

  const handleFinishMessage = useCallback((sessionId: string) => {
    queryClient.invalidateQueries({ queryKey: ["rag-conversations"] });
    setPendingSessionId(null);
    void loadSessionMessages(sessionId);
  }, [queryClient, loadSessionMessages]);

  const setActiveSession = useCallback(
    (sessionId: string | null) => {
      setPendingSessionId(null);
      setPendingFirstMessage(null);
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
    async (message: string) => {
      const title = message.substring(0, 50);
      try {
        const result = await createConversation.mutateAsync(title);
        const sessionId = result.session_id;
        setPendingSessionId(sessionId);
        setPendingFirstMessage(message);
        router.push(`/ai-assistant?session=${sessionId}`, { scroll: false });
      } catch {
        // Creation failed — don't proceed
      }
    },
    [createConversation, router],
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 bg-[hsl(var(--surface-alt))]">
      <ConversationSidebar
        conversations={conversations}
        activeSessionId={effectiveSessionId}
        isLoading={isLoadingConvos}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      {effectiveSessionId ? (
        <ChatWithSession
          key={effectiveSessionId}
          sessionId={effectiveSessionId}
          initialMessages={initialMessages}
          toolTracesByMessageId={toolTracesByMessageId}
          sourcesByMessageId={sourcesByMessageId}
          isLoadingMessages={isLoadingMessages}
          pendingFirstMessage={pendingFirstMessage}
          councilMode={councilMode}
          onCouncilModeChange={setCouncilMode}
          selectedProjectId={selectedProjectId}
          onProjectChange={setSelectedProjectId}
          onFinishMessage={handleFinishMessage}
        />
      ) : (
        <ChatArea
          messages={[]}
          toolTracesByMessageId={{}}
          isLoadingMessages={false}
          isStreaming={false}
          input={noSessionInput}
          councilMode={councilMode}
          onCouncilModeChange={setCouncilMode}
          selectedProjectId={selectedProjectId}
          onProjectChange={setSelectedProjectId}
          onInputChange={setNoSessionInput}
          onSubmit={(msg: string) => {
            setNoSessionInput("");
            handleFirstMessage(msg);
          }}
          onStop={() => {}}
        />
      )}
    </div>
  );
}
