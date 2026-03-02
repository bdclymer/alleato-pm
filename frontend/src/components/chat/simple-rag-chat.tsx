"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimpleRagChatProps {
  placeholder?: string;
}

interface ChatHistoryMessage {
  id: string;
  role: string;
  content: string;
}

const WIDGET_SESSION_STORAGE_KEY = "ai-assistant-widget-session-id";

function dbMessageToUIMessage(msg: ChatHistoryMessage): UIMessage {
  return {
    id: msg.id,
    role: msg.role as "user" | "assistant",
    parts: [{ type: "text", text: msg.content }],
  };
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("");
}

export function SimpleRagChat({
  placeholder = "Message Alleato AI...",
}: SimpleRagChatProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  sessionIdRef.current = sessionId;

  const { messages, setMessages, sendMessage, status } = useChat({
    id: sessionId ?? "widget-session",
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
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const savedSession = localStorage.getItem(WIDGET_SESSION_STORAGE_KEY);
    if (!savedSession) return;

    setSessionId(savedSession);
    setIsLoadingMessages(true);
    fetch(`/api/ai-assistant/messages/${savedSession}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load chat history");
        const data = await res.json();
        const historyMessages = (data.messages || []).map(
          (msg: ChatHistoryMessage) => dbMessageToUIMessage(msg),
        );
        setMessages(historyMessages);
      })
      .catch(() => {
        localStorage.removeItem(WIDGET_SESSION_STORAGE_KEY);
        setSessionId(null);
        setMessages([]);
      })
      .finally(() => {
        setIsLoadingMessages(false);
      });
  }, [setMessages]);

  const createConversation = useCallback(async (title: string) => {
    const response = await fetch("/api/ai-assistant/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error("Failed to create conversation");
    }

    const data = await response.json();
    const nextSessionId = data?.conversation?.session_id as string;
    if (!nextSessionId) {
      throw new Error("Conversation was created without a session id");
    }

    sessionIdRef.current = nextSessionId;
    localStorage.setItem(WIDGET_SESSION_STORAGE_KEY, nextSessionId);
    setSessionId(nextSessionId);
    return nextSessionId;
  }, []);

  const handleSendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    const isStreaming = status === "streaming";
    if (!trimmedInput || isStreaming || isCreatingSession || isLoadingMessages) {
      return;
    }

    setInput("");

    try {
      if (!sessionIdRef.current) {
        setIsCreatingSession(true);
        const title = trimmedInput.substring(0, 50) || "New conversation";
        await createConversation(title);
      }
      sendMessage({ text: trimmedInput });
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while sending your message.";

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [{ type: "text", text: `Request failed: ${errorText}` }],
        },
      ]);
    } finally {
      setIsCreatingSession(false);
    }
  }, [
    input,
    status,
    isCreatingSession,
    isLoadingMessages,
    createConversation,
    sendMessage,
    setMessages,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const isLoading =
    isLoadingMessages ||
    isCreatingSession ||
    status === "submitted" ||
    status === "streaming";

  return (
    <div
      className="flex flex-col h-full w-full bg-background"
      data-testid="simple-rag-chat"
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Loading chat history...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Alleato AI Assistant
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Ask me about your projects, tasks, meetings, or anything else. I
              have access to your Supabase data.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {[
                "What projects do we have?",
                "Show me recent tasks",
                "Summarize the latest meetings",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="px-4 py-1.5 text-sm bg-muted hover:bg-muted rounded-full transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-4 animate-in fade-in slide-in-from-bottom-2",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-emerald-600" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2",
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-foreground",
                )}
              >
                <p className="text-sm whitespace-pre-wrap">
                  {getMessageText(message)}
                </p>
              </div>
              {message.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-4 animate-in fade-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-2">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="min-h-[44px] max-h-[200px] resize-none"
            rows={1}
          />
          <Button
            onClick={() => {
              void handleSendMessage();
            }}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[44px] w-[44px] flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
