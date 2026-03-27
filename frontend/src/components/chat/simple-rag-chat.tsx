"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Loader2 } from "lucide-react";
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

const STARTER_PROMPTS = [
  "What projects do we have?",
  "Show me recent tasks",
  "Summarize the latest meetings",
];

const COUNCIL_STARTER_PROMPTS = [
  "Give me the state of the business",
  "What should we focus on this week?",
  "What are our biggest risks right now?",
  "Should we bid on this project?",
];

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
  const [councilMode, setCouncilMode] = useState(false);
  const councilModeRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync so the transport closure always reads current value
  councilModeRef.current = councilMode;

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
            councilMode: councilModeRef.current,
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
      .finally(() => setIsLoadingMessages(false));
  }, [setMessages]);

  const createConversation = useCallback(async (title: string) => {
    const response = await fetch("/api/ai-assistant/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error("Failed to create conversation");
    const data = await response.json();
    const nextSessionId = data?.conversation?.session_id as string;
    if (!nextSessionId) throw new Error("Conversation created without session id");
    sessionIdRef.current = nextSessionId;
    localStorage.setItem(WIDGET_SESSION_STORAGE_KEY, nextSessionId);
    setSessionId(nextSessionId);
    return nextSessionId;
  }, []);

  const handleSendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    const isStreaming = status === "streaming";
    if (!trimmedInput || isStreaming || isCreatingSession || isLoadingMessages) return;

    setInput("");
    try {
      if (!sessionIdRef.current) {
        setIsCreatingSession(true);
        await createConversation(trimmedInput.substring(0, 50) || "New conversation");
      }
      sendMessage({ text: trimmedInput });
    } catch (error) {
      const errorText =
        error instanceof Error ? error.message : "An unexpected error occurred.";
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
  }, [input, status, isCreatingSession, isLoadingMessages, createConversation, sendMessage, setMessages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const isLoading =
    isLoadingMessages || isCreatingSession || status === "submitted" || status === "streaming";

  const activeStarters = councilMode ? COUNCIL_STARTER_PROMPTS : STARTER_PROMPTS;

  return (
    <div className="flex flex-col h-full w-full bg-background" data-testid="simple-rag-chat">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Loading…
          </div>
        ) : messages.length === 0 ? (
          /* Welcome state */
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            {councilMode ? (
              <>
                <div className="text-2xl">⚡</div>
                <h3 className="text-base font-semibold text-foreground">
                  Council Mode
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  Your C-Suite speaks directly. Ask a big question and hear from the CFO, COO, CRO, and more — each in their own voice.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-foreground">
                  Alleato AI Assistant
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  Ask me about your projects, tasks, meetings, or anything else.
                </p>
              </>
            )}
            <div className="flex flex-col gap-2 mt-2 w-full max-w-xs">
              {activeStarters.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="w-full px-4 py-2 text-sm text-foreground bg-transparent hover:bg-muted rounded-full transition-colors text-center border border-border/50 hover:border-primary/30"
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
                "flex gap-3 animate-in fade-in slide-in-from-bottom-2",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary">
                  {councilMode ? "⚡" : "A"}
                </div>
              )}
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-4 py-2.5",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {getMessageText(message)}
                </p>
              </div>
            </div>
          ))
        )}

        {/* Loading dots — council mode shows "Convening council…" */}
        {isLoading && messages.length > 0 && (
          <div className="flex gap-3 animate-in fade-in">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary">
              {councilMode ? "⚡" : "A"}
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
              {councilMode && (
                <span className="text-xs text-muted-foreground mr-1">Convening council</span>
              )}
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 space-y-2">
        {/* Council Mode toggle — sits above the input, no border on the row itself */}
        <div className="flex items-center justify-end gap-2 px-1">
          <span className="text-xs text-muted-foreground">Council Mode</span>
          <button
            type="button"
            role="switch"
            aria-checked={councilMode}
            onClick={() => setCouncilMode((v) => !v)}
            className={cn(
              "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none",
              councilMode ? "bg-primary" : "bg-muted-foreground/30",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 mt-0.5",
                councilMode ? "translate-x-4" : "translate-x-0.5",
              )}
            />
          </button>
        </div>

        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={councilMode ? "Ask the C-Suite anything…" : placeholder}
            disabled={isLoading}
            className="min-h-[44px] max-h-[160px] resize-none rounded-xl"
            rows={1}
          />
          <Button
            onClick={() => void handleSendMessage()}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[44px] w-[44px] flex-shrink-0 rounded-xl bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
