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

interface ChatHistoryMessage {
  id: string;
  role: string;
  content: string;
  sources: unknown[] | null;
  created_at: string | null;
}

function dbMessageToUIMessage(msg: ChatHistoryMessage): UIMessage {
  return {
    id: msg.id,
    role: msg.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: msg.content }],
  };
}

function ChatWithSession({
  sessionId,
  initialMessages,
  isLoadingMessages,
  pendingFirstMessage,
  onFinishMessage,
}: {
  sessionId: string;
  initialMessages: UIMessage[];
  isLoadingMessages: boolean;
  pendingFirstMessage: string | null;
  onFinishMessage: () => void;
}) {
  const [input, setInput] = useState(pendingFirstMessage ?? "");
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

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
          },
        };
      },
    }),
    onFinish: () => {
      onFinishMessage();
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
      isLoadingMessages={isLoadingMessages}
      isStreaming={isStreaming}
      input={input}
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
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [noSessionInput, setNoSessionInput] = useState("");

  // Conversation CRUD (React Query — unchanged)
  const { data: conversations = [], isLoading: isLoadingConvos } =
    useRagConversations();
  const createConversation = useCreateConversation();
  const renameConversation = useRenameConversation();
  const deleteConversation = useDeleteConversation();

  // Load messages when session changes
  useEffect(() => {
    const sessionId = activeSessionId;
    if (!sessionId) {
      setInitialMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    fetch(`/api/ai-assistant/messages/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        const msgs: UIMessage[] = (data.messages || []).map(
          (m: ChatHistoryMessage) => dbMessageToUIMessage(m),
        );
        setInitialMessages(msgs);
      })
      .catch(() => {
        setInitialMessages([]);
      })
      .finally(() => setIsLoadingMessages(false));
  }, [activeSessionId]);

  const effectiveSessionId = activeSessionId || pendingSessionId;

  const handleFinishMessage = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["rag-conversations"] });
    setPendingSessionId(null);
  }, [queryClient]);

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

  const handleNewChat = useCallback(() => {
    setActiveSession(null);
    setInitialMessages([]);
    setPendingFirstMessage(null);
  }, [setActiveSession]);

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
    <div className="flex h-full min-h-0 w-full min-w-0">
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
          isLoadingMessages={isLoadingMessages}
          pendingFirstMessage={pendingFirstMessage}
          onFinishMessage={handleFinishMessage}
        />
      ) : (
        <ChatArea
          messages={[]}
          isLoadingMessages={false}
          isStreaming={false}
          input={noSessionInput}
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
