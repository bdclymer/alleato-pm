"use client";

import { useCallback, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useRagConversations,
  useCreateConversation,
  useRenameConversation,
  useDeleteConversation,
} from "@/hooks/use-rag-conversations";
import {
  useRagMessages,
  useSendRagMessage,
  type RagMessage,
} from "@/hooks/use-rag-messages";
import { ConversationSidebar } from "./conversation-sidebar";
import { ChatArea } from "./chat-area";

export function RagChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSessionId = searchParams.get("session");

  // Local optimistic messages for the current session
  const [optimisticMessages, setOptimisticMessages] = useState<RagMessage[]>(
    [],
  );
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  // Queries
  const { data: conversations = [], isLoading: isLoadingConvos } =
    useRagConversations();
  const {
    data: serverMessages = [],
    isLoading: isLoadingMessages,
  } = useRagMessages(activeSessionId);

  // Mutations
  const createConversation = useCreateConversation();
  const renameConversation = useRenameConversation();
  const deleteConversation = useDeleteConversation();
  const sendMessage = useSendRagMessage();

  // Merge server messages with optimistic ones
  const displayMessages =
    optimisticMessages.length > 0 ? optimisticMessages : serverMessages;

  const setActiveSession = useCallback(
    (sessionId: string | null) => {
      setOptimisticMessages([]);
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

  const handleSendMessage = useCallback(
    async (message: string) => {
      let sessionId = activeSessionId;

      // Create conversation if none active
      if (!sessionId) {
        const title = message.substring(0, 50);
        try {
          const result = await createConversation.mutateAsync(title);
          sessionId = result.session_id;
          setPendingSessionId(sessionId);
          router.push(`/ai-assistant?session=${sessionId}`, { scroll: false });
        } catch {
          return;
        }
      }

      // Optimistically show user message
      const userMsg: RagMessage = {
        id: `opt-user-${Date.now()}`,
        role: "user",
        content: message,
        sources: null,
        created_at: new Date().toISOString(),
      };

      const currentMessages =
        optimisticMessages.length > 0 ? optimisticMessages : serverMessages;
      setOptimisticMessages([...currentMessages, userMsg]);

      // Send and get response
      sendMessage.mutate(
        { sessionId, message },
        {
          onSuccess: (data) => {
            const assistantMsg: RagMessage = {
              id: `opt-assistant-${Date.now()}`,
              role: "assistant",
              content: data.response,
              sources: data.sources,
              created_at: new Date().toISOString(),
            };
            setOptimisticMessages((prev) => [...prev, assistantMsg]);
            setPendingSessionId(null);
          },
          onError: () => {
            const errorMsg: RagMessage = {
              id: `opt-error-${Date.now()}`,
              role: "assistant",
              content:
                "Sorry, something went wrong. Please try again.",
              sources: null,
              created_at: new Date().toISOString(),
            };
            setOptimisticMessages((prev) => [...prev, errorMsg]);
            setPendingSessionId(null);
          },
        },
      );
    },
    [
      activeSessionId,
      createConversation,
      optimisticMessages,
      serverMessages,
      sendMessage,
      router,
    ],
  );

  const isSending = sendMessage.isPending || createConversation.isPending;

  return (
    <div className="flex h-full w-full">
      <ConversationSidebar
        conversations={conversations}
        activeSessionId={activeSessionId || pendingSessionId}
        isLoading={isLoadingConvos}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <ChatArea
        messages={displayMessages}
        isLoadingMessages={isLoadingMessages}
        isSending={isSending}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
