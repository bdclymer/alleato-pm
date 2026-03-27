"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Paperclip,
  ArrowUp,
  Plus,
  ChevronDown,
  Sparkles,
  BarChart3,
  ClipboardList,
  MessageSquareText,
  BriefcaseIcon,
} from "lucide-react";
import {
  useRagConversations,
  useCreateConversation,
  useRenameConversation,
  useDeleteConversation,
} from "@/hooks/use-rag-conversations";
import { ConversationSidebar } from "@/components/ai-assistant/conversation-sidebar";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ChatHistoryMessage {
  id: string;
  role: string;
  content: string;
}

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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

// ---------------------------------------------------------------------------
// Starter prompts
// ---------------------------------------------------------------------------

const STARTER_PROMPTS = [
  {
    label: "Summarize project risks across the portfolio",
    icon: BarChart3,
  },
  {
    label: "What are our biggest budget variances?",
    icon: ClipboardList,
  },
  {
    label: "Draft a weekly status update",
    icon: MessageSquareText,
  },
  {
    label: "Show open action items from recent meetings",
    icon: BriefcaseIcon,
  },
];

const COUNCIL_STARTER_PROMPTS = [
  {
    label: "Give me the state of the business",
    icon: BarChart3,
  },
  {
    label: "What should we focus on this week?",
    icon: ClipboardList,
  },
  {
    label: "What are our biggest risks right now?",
    icon: Sparkles,
  },
  {
    label: "Should we bid on this project?",
    icon: BriefcaseIcon,
  },
];

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ChatRagPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [councilMode, setCouncilMode] = useState(false);
  const councilModeRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  councilModeRef.current = councilMode;
  sessionIdRef.current = activeSessionId;

  // Conversations sidebar
  const { data: conversations = [], isLoading: isLoadingConversations } =
    useRagConversations();
  const createConversation = useCreateConversation();
  const renameConversation = useRenameConversation();
  const deleteConversation = useDeleteConversation();

  // Chat hook
  const { messages, setMessages, sendMessage, status } = useChat({
    id: activeSessionId ?? "fullpage-session",
    transport: useMemo(
      () =>
        new DefaultChatTransport({
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
      [],
    ),
  });

  const isStreaming =
    status === "streaming" || status === "submitted";

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load messages when switching conversations
  const loadConversation = useCallback(
    async (sessionId: string) => {
      setActiveSessionId(sessionId);
      setIsLoadingMessages(true);
      try {
        const res = await fetch(`/api/ai-assistant/messages/${sessionId}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        const historyMessages = (data.messages || []).map(
          (msg: ChatHistoryMessage) => dbMessageToUIMessage(msg),
        );
        setMessages(historyMessages);
      } catch {
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [setMessages],
  );

  // New chat
  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setInput("");
    textareaRef.current?.focus();
  }, [setMessages]);

  // Send message
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || isLoadingMessages) return;

    setInput("");
    try {
      if (!sessionIdRef.current) {
        const convo = await createConversation.mutateAsync(
          trimmed.substring(0, 50) || "New conversation",
        );
        setActiveSessionId(convo.session_id);
        sessionIdRef.current = convo.session_id;
      }
      sendMessage({ text: trimmed });
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
    }
  }, [
    input,
    isStreaming,
    isLoadingMessages,
    createConversation,
    sendMessage,
    setMessages,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleStarterClick = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const activeStarters = councilMode
    ? COUNCIL_STARTER_PROMPTS
    : STARTER_PROMPTS;

  const showWelcome = messages.length === 0 && !isLoadingMessages;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Conversation sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeSessionId={activeSessionId}
        isLoading={isLoadingConversations}
        onSelectConversation={loadConversation}
        onNewChat={handleNewChat}
        onRename={(sessionId, title) =>
          renameConversation.mutate({ sessionId, title })
        }
        onDelete={(sessionId) => {
          deleteConversation.mutate(sessionId);
          if (activeSessionId === sessionId) handleNewChat();
        }}
      />

      {/* Main chat area */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Top bar — model selector & new thread */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-6">
          <Button
            type="button"
            variant="ghost"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Alleato AI
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <div className="flex items-center gap-2">
            {/* Council mode toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Council</span>
              <Button
                type="button"
                role="switch"
                variant="ghost"
                aria-checked={councilMode}
                onClick={() => setCouncilMode((v) => !v)}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full p-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  councilMode ? "bg-primary" : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-xs transition-transform duration-200 mt-0.5",
                    councilMode ? "translate-x-4" : "translate-x-0.5",
                  )}
                />
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleNewChat}
            >
              <Plus />
              New Thread
            </Button>
          </div>
        </div>

        {/* Chat content */}
        <div className="flex min-h-0 flex-1 flex-col">
          {showWelcome ? (
            /* ───── Welcome screen ───── */
            <div className="flex flex-1 flex-col items-center justify-center px-6">
              <div className="flex w-full max-w-2xl flex-col items-center">
                {/* Avatar orb */}
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary shadow-sm">
                  <span className="text-2xl font-semibold text-primary-foreground">
                    A
                  </span>
                </div>

                {/* Greeting */}
                <h1 className="text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {getGreeting()}.
                  <br />
                  What&rsquo;s on{" "}
                  <span className="text-primary">your</span> mind?
                </h1>

                {/* Input area */}
                <div className="mt-10 w-full">
                  <div className="relative rounded-2xl border border-border bg-background shadow-xs transition-shadow focus-within:shadow-sm focus-within:border-primary/40">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        councilMode
                          ? "Ask the C-Suite anything..."
                          : "Ask AI a question or make a request..."
                      }
                      className="min-h-[56px] max-h-[200px] resize-none border-0 bg-transparent px-4 pt-4 pb-12 text-base shadow-none ring-0 focus-visible:ring-0 placeholder:text-muted-foreground/60"
                      rows={1}
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 pb-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1.5 rounded-full px-3 text-muted-foreground hover:text-foreground"
                        >
                          <Paperclip />
                          Attach
                        </Button>
                      </div>
                      <Button
                        size="icon"
                        className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
                        disabled={!input.trim() || isStreaming}
                        onClick={() => void handleSend()}
                      >
                        <ArrowUp />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Starter prompts */}
                <div className="mt-6 w-full">
                  <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Get started with an example
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {activeStarters.map((starter) => {
                      const Icon = starter.icon;
                      return (
                        <Button
                          key={starter.label}
                          type="button"
                          variant="outline"
                          onClick={() => handleStarterClick(starter.label)}
                          className="group flex h-auto items-start gap-3 rounded-xl border-border/60 bg-background px-4 py-3 text-left text-sm text-foreground transition-all hover:border-primary/30 hover:bg-muted/40"
                        >
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                          <span className="leading-snug">{starter.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ───── Active chat view ───── */
            <>
              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                      Loading conversation...
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-4 animate-in fade-in slide-in-from-bottom-2",
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start",
                        )}
                      >
                        {message.role === "assistant" && (
                          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <span className="text-xs font-semibold text-primary">
                              {councilMode ? "⚡" : "A"}
                            </span>
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-3",
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

                  {/* Streaming indicator */}
                  {isStreaming && messages.length > 0 && (
                    <div className="flex gap-4 animate-in fade-in">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-xs font-semibold text-primary">
                          {councilMode ? "⚡" : "A"}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-muted px-4 py-3 flex items-center gap-2">
                        {councilMode && (
                          <span className="text-xs text-muted-foreground mr-1">
                            Convening council
                          </span>
                        )}
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Bottom input — active chat */}
              <div className="border-t border-border/40 bg-background px-6 pb-6 pt-4">
                <div className="mx-auto max-w-3xl">
                  <div className="relative rounded-2xl border border-border bg-background shadow-xs transition-shadow focus-within:shadow-sm focus-within:border-primary/40">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        councilMode
                          ? "Ask the C-Suite anything..."
                          : "Message Alleato AI..."
                      }
                      disabled={isStreaming}
                      className="min-h-[48px] max-h-[160px] resize-none border-0 bg-transparent px-4 pt-3 pb-10 text-sm shadow-none ring-0 focus-visible:ring-0"
                      rows={1}
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 pb-2.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1.5 rounded-full px-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <Paperclip />
                        Attach
                      </Button>
                      <Button
                        size="icon"
                        className="h-7 w-7 rounded-full bg-primary hover:bg-primary/90"
                        disabled={!input.trim() || isStreaming}
                        onClick={() => void handleSend()}
                      >
                        <ArrowUp />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
