"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import type { ChatStatus, UIMessage } from "ai";
import { BrainCircuit, Plus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiChatSidebarStore } from "@/lib/stores/ai-chat-sidebar-store";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { DEFAULT_AI_ASSISTANT_MODEL } from "@/lib/ai/assistant-models";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActions,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

const AI_CHAT_SIDEBAR_WIDTH = "var(--ai-chat-sidebar-width, 380px)";

// ── Sidebar toggle button (used in sidebar header) ──────────────────────────

export function AiChatSidebarButton({ className }: { className?: string }) {
  const { open, toggle } = useAiChatSidebarStore();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label="Toggle AI strategist"
      aria-pressed={open}
      className={cn(
        "h-8 w-8",
        open
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      <BrainCircuit className="h-4 w-4" strokeWidth={1.5} />
    </Button>
  );
}

// ── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = message.parts
    ?.filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("") ?? "";

  if (!text) return null;

  return (
    <Message from={message.role} className={!isUser ? "flex-row items-start" : undefined}>
      {!isUser && (
        <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <BrainCircuit className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
        </div>
      )}
      <MessageContent
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-1.5 text-sm leading-relaxed",
          isUser
            ? "bg-muted text-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {isUser ? text : <MessageResponse>{text}</MessageResponse>}
      </MessageContent>
    </Message>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 pl-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

// ── Chat input ───────────────────────────────────────────────────────────────

function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  disabled,
  status,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (msg: string) => void;
  onStop: () => void;
  disabled: boolean;
  status: ChatStatus;
}) {
  const isStreaming = status === "streaming" || status === "submitted";
  const handleSubmit = () => {
    if (value.trim() && !disabled) onSubmit(value);
  };

  return (
    <div className="shrink-0 px-3 pb-3 pt-2">
      <PromptInput
        value={value}
        onValueChange={onChange}
        onSubmit={handleSubmit}
        disabled={disabled}
        isLoading={isStreaming}
        className="rounded-lg border-input bg-background px-3 py-2"
      >
        <PromptInputTextarea
          value={value}
          placeholder="Ask anything..."
          className="min-h-0 px-0 py-0 text-sm"
          style={{ maxHeight: "120px", overflowY: "auto" }}
        />
        <PromptInputActions className="justify-end">
          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onStop}
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <PromptInputSubmit
              disabled={!value.trim() || disabled}
              status={status}
              className="h-7 w-7 shrink-0"
            />
          )}
        </PromptInputActions>
      </PromptInput>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
        Shift+Enter for new line
      </p>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  input,
  onChange,
  onSubmit,
  isSubmitting,
}: {
  input: string;
  onChange: (v: string) => void;
  onSubmit: (msg: string) => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 pb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <BrainCircuit className="h-5 w-5 text-primary" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">AI Strategist</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ask about your projects, budgets, or anything else
          </p>
        </div>
      </div>
      <ChatInput
        value={input}
        onChange={onChange}
        onSubmit={onSubmit}
        onStop={() => {}}
        disabled={isSubmitting}
        status={isSubmitting ? "submitted" : "ready"}
      />
    </div>
  );
}

// ── Active chat session ──────────────────────────────────────────────────────

function ActiveChat({
  sessionId,
  pendingFirstMessage,
}: {
  sessionId: string;
  pendingFirstMessage: string | null;
}) {
  const sessionIdRef = React.useRef(sessionId);
  sessionIdRef.current = sessionId;

  const { messages, sendMessage, status, stop } = useChat({
    id: sessionId,
    messages: [],
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    transport: new DefaultChatTransport({
      api: "/api/ai-assistant/chat",
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);
        return {
          body: {
            id: sessionIdRef.current,
            message: lastMessage,
            messages: request.messages,
            selectedModel: DEFAULT_AI_ASSISTANT_MODEL,
          },
        };
      },
    }),
  });

  const hasSentFirst = React.useRef(false);
  React.useEffect(() => {
    if (pendingFirstMessage && !hasSentFirst.current) {
      hasSentFirst.current = true;
      sendMessage({ text: pendingFirstMessage });
    }
  }, [pendingFirstMessage, sendMessage]);

  const [input, setInput] = React.useState("");

  const isStreaming = status === "streaming" || status === "submitted";

  const handleSubmit = React.useCallback(
    (msg: string) => {
      if (!msg.trim() || isStreaming) return;
      sendMessage({ text: msg });
      setInput("");
    },
    [sendMessage, isStreaming],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 px-4 py-4">
        <ConversationContent className="gap-3 p-0">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isStreaming && <LoadingDots />}
        </ConversationContent>
        <ConversationScrollButton className="bottom-3 z-20" />
      </Conversation>
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onStop={stop}
        disabled={isStreaming}
        status={status}
      />
    </div>
  );
}

// ── Embedded chat (top-level, manages session lifecycle) ─────────────────────

function EmbeddedAiChat() {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [pendingFirstMessage, setPendingFirstMessage] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  const handleFirstSubmit = React.useCallback(async (message: string) => {
    if (isCreating || !message.trim()) return;
    setIsCreating(true);
    try {
      const data = await apiFetch<{ conversation: { session_id: string } }>(
        "/api/ai-assistant/conversations",
        { method: "POST", body: JSON.stringify({ title: message.slice(0, 50) }) },
      );
      setSessionId(data.conversation.session_id);
      setPendingFirstMessage(message);
      setInput("");
    } finally {
      setIsCreating(false);
    }
  }, [isCreating]);

  const handleNewChat = React.useCallback(() => {
    setSessionId(null);
    setPendingFirstMessage(null);
    setInput("");
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      {sessionId && (
        <div className="flex shrink-0 items-center justify-end px-3 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </Button>
        </div>
      )}

      {sessionId ? (
        <ActiveChat
          key={sessionId}
          sessionId={sessionId}
          pendingFirstMessage={pendingFirstMessage}
        />
      ) : (
        <EmptyState
          input={input}
          onChange={setInput}
          onSubmit={handleFirstSubmit}
          isSubmitting={isCreating}
        />
      )}
    </div>
  );
}

// ── Slide-in panel (lives in main layout) ───────────────────────────────────

export function AiChatSidebarPanel() {
  const open = useAiChatSidebarStore((s) => s.open);
  const setOpen = useAiChatSidebarStore((s) => s.setOpen);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <div
      className={cn(
        "h-full shrink-0 border-r border-border bg-card flex flex-col overflow-hidden",
        "transition-[width] duration-300 ease-in-out",
        open ? "border-r" : "w-0 border-r-0",
      )}
      style={{ width: open ? AI_CHAT_SIDEBAR_WIDTH : 0 }}
    >
      {mounted && (
        <div className="flex h-full w-full min-w-0 flex-col" style={{ width: AI_CHAT_SIDEBAR_WIDTH }}>
          {/* Panel header */}
          <div className="flex shrink-0 items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                <BrainCircuit className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-medium text-foreground">AI Strategist</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              aria-label="Close AI chat"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Chat */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <EmbeddedAiChat />
          </div>
        </div>
      )}
    </div>
  );
}
