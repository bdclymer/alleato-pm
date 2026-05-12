"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import type { ChatStatus, UIMessage } from "ai";
import { BrainCircuit, Plus, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const STARTER_ACTIONS = [
  "What needs attention today?",
  "Summarize project risk",
  "Draft follow-ups",
];

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text =
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
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
          "compact-ai-message-bubble rounded-lg px-3 py-1.5 text-sm leading-relaxed",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {isUser ? text : <MessageResponse>{text}</MessageResponse>}
      </MessageContent>
    </Message>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 pl-8" aria-label="Assistant is responding">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40"
          style={{ animationDelay: `${index * 150}ms` }}
        />
      ))}
    </div>
  );
}

function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  disabled,
  status,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: string) => void;
  onStop: () => void;
  disabled: boolean;
  status: ChatStatus;
  autoFocus?: boolean;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const isStreaming = status === "streaming" || status === "submitted";

  React.useEffect(() => {
    if (!autoFocus || disabled) return;
    const frame = window.requestAnimationFrame(() => {
      rootRef.current?.querySelector("textarea")?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [autoFocus, disabled]);

  const handleSubmit = React.useCallback(() => {
    if (value.trim() && !disabled) onSubmit(value);
  }, [disabled, onSubmit, value]);

  return (
    <div ref={rootRef} className="shrink-0 px-3 pb-3 pt-2">
      <PromptInput
        value={value}
        onValueChange={onChange}
        onSubmit={handleSubmit}
        disabled={disabled}
        isLoading={isStreaming}
        maxHeight={112}
        className="rounded-xl border-input bg-background px-3 py-2 shadow-none"
      >
        <div className="flex items-end gap-2">
          <PromptInputTextarea
            value={value}
            placeholder="Ask Alleato..."
            className="min-h-9 px-0 py-1 text-sm leading-5 text-foreground"
            minHeight={36}
            maxHeight={112}
          />
          <PromptInputActions className="pb-0.5">
            {isStreaming ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={onStop}
                aria-label="Stop response"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <PromptInputSubmit
                disabled={!value.trim() || disabled}
                status={status}
                aria-label="Send message"
                className="h-8 w-8 shrink-0 rounded-lg"
                size="icon-sm"
              />
            )}
          </PromptInputActions>
        </div>
      </PromptInput>
    </div>
  );
}

function EmptyState({
  input,
  onChange,
  onSubmit,
  isSubmitting,
  autoFocus,
}: {
  input: string;
  onChange: (value: string) => void;
  onSubmit: (message: string) => void;
  isSubmitting: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-end gap-4 px-4 pb-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">How can I help?</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Ask about project risk, follow-ups, budgets, or recent activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STARTER_ACTIONS.map((action) => (
            <Button
              key={action}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onSubmit(action)}
              disabled={isSubmitting}
              className="rounded-full px-3 text-xs text-foreground hover:bg-muted"
            >
              {action}
            </Button>
          ))}
        </div>
      </div>
      <ChatInput
        value={input}
        onChange={onChange}
        onSubmit={onSubmit}
        onStop={() => {}}
        disabled={isSubmitting}
        status={isSubmitting ? "submitted" : "ready"}
        autoFocus={autoFocus}
      />
    </div>
  );
}

function ActiveChat({
  sessionId,
  pendingFirstMessage,
  autoFocusComposer,
}: {
  sessionId: string;
  pendingFirstMessage: string | null;
  autoFocusComposer?: boolean;
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
    (message: string) => {
      if (!message.trim() || isStreaming) return;
      sendMessage({ text: message });
      setInput("");
    },
    [isStreaming, sendMessage],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 px-4 py-4">
        <ConversationContent className="gap-3 p-0">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
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
        autoFocus={autoFocusComposer}
      />
    </div>
  );
}

export function CompactAiChat({
  autoFocusComposer,
}: {
  autoFocusComposer?: boolean;
}) {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [pendingFirstMessage, setPendingFirstMessage] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  const handleFirstSubmit = React.useCallback(
    async (message: string) => {
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
    },
    [isCreating],
  );

  const handleNewChat = React.useCallback(() => {
    setSessionId(null);
    setPendingFirstMessage(null);
    setInput("");
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
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
          autoFocusComposer={autoFocusComposer}
        />
      ) : (
        <EmptyState
          input={input}
          onChange={setInput}
          onSubmit={handleFirstSubmit}
          isSubmitting={isCreating}
          autoFocus={autoFocusComposer}
        />
      )}
    </div>
  );
}
