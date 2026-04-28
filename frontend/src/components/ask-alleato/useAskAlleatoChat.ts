"use client";

import * as React from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { apiFetch } from "@/lib/api-client";
import type { RagConversation } from "@/hooks/use-rag-conversations";

function stripStatusParts(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.filter((part) => part.type !== "data-status"),
  }));
}

export function getMessageText(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function useAskAlleatoChat() {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const sessionIdRef = React.useRef<string | null>(null);

  const chat = useChat({
    id: sessionId ?? "ask-alleato-draft",
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
          },
        };
      },
    }),
    onError(nextError) {
      setError(nextError.message || "Ask Alleato could not get a response.");
    },
  });

  const ensureSession = React.useCallback(async () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const data = await apiFetch<{ conversation: RagConversation }>(
      "/api/ai-assistant/conversations",
      {
        method: "POST",
        body: JSON.stringify({ title: "Ask Alleato" }),
      },
    );
    const nextSessionId = data.conversation.session_id;
    sessionIdRef.current = nextSessionId;
    setSessionId(nextSessionId);
    return nextSessionId;
  }, []);

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || chat.status === "streaming") return;
      setError(null);
      await ensureSession();
      chat.sendMessage({ text: trimmed });
    },
    [chat, ensureSession],
  );

  return {
    ...chat,
    sessionId,
    send,
    error,
    isStreaming: chat.status === "streaming",
  };
}
