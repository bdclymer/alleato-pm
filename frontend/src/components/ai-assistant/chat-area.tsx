"use client";

import { useCallback } from "react";
import type { UIMessage } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/chat/prompt-input";
import { Button } from "@/components/ui/button";
import { BotIcon, CopyIcon, SendIcon, SquareIcon } from "lucide-react";
import { toast } from "sonner";
import { WelcomeScreen } from "./welcome-screen";
import {
  TracePanel,
  type ToolTraceItem,
} from "./trace-panel";

function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

interface ChatAreaProps {
  messages: UIMessage[];
  toolTracesByMessageId?: Record<string, ToolTraceItem[]>;
  isLoadingMessages: boolean;
  isStreaming: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (message: string) => void;
  onStop: () => void;
}

export function ChatArea({
  messages,
  toolTracesByMessageId = {},
  isLoadingMessages,
  isStreaming,
  input,
  onInputChange,
  onSubmit,
  onStop,
}: ChatAreaProps) {
  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSubmit(trimmed);
  }, [input, isStreaming, onSubmit]);

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {!hasMessages && !isLoadingMessages ? (
        <WelcomeScreen onSelectPrompt={(prompt) => onSubmit(prompt)} />
      ) : (
        <Conversation>
          <ConversationContent className="mx-auto w-full max-w-3xl px-4">
            {messages.map((msg) => {
              const text = getMessageText(msg);
              const isAssistant = msg.role === "assistant";

              return (
                <Message key={msg.id} from={msg.role as "user" | "assistant"}>
                  {isAssistant && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <BotIcon className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <MessageContent>
                    <MessageResponse>{text}</MessageResponse>
                    {isAssistant && (
                      <TracePanel
                        traces={toolTracesByMessageId[msg.id] ?? []}
                      />
                    )}
                  </MessageContent>
                  {isAssistant && text && (
                    <MessageActions>
                      <MessageAction
                        tooltip="Copy"
                        onClick={() => handleCopy(text)}
                      >
                        <CopyIcon className="h-3.5 w-3.5" />
                      </MessageAction>
                    </MessageActions>
                  )}
                </Message>
              );
            })}

            {isStreaming &&
              messages.length > 0 &&
              messages[messages.length - 1].role === "user" && (
                <Message from="assistant">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <BotIcon className="h-4 w-4 text-primary" />
                  </div>
                  <MessageContent>
                    <div className="flex items-center gap-2 py-2">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                    </div>
                  </MessageContent>
                </Message>
              )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
        <PromptInput
          value={input}
          onValueChange={onInputChange}
          isLoading={isStreaming}
          onSubmit={handleSubmit}
        >
          <PromptInputTextarea placeholder="Message Alleato AI..." />
          <PromptInputActions className="justify-end px-2 pb-2">
            <PromptInputAction tooltip={isStreaming ? "Stop" : "Send"}>
              <Button
                size="icon"
                variant={input.trim() ? "default" : "ghost"}
                className="h-8 w-8 rounded-full"
                disabled={!input.trim() && !isStreaming}
                onClick={isStreaming ? onStop : handleSubmit}
              >
                {isStreaming ? (
                  <SquareIcon className="h-4 w-4" />
                ) : (
                  <SendIcon className="h-4 w-4" />
                )}
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Alleato AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
