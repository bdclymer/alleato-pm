"use client";

import { useCallback, useState } from "react";
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
import { SourceCitations } from "./source-citations";
import { WelcomeScreen } from "./welcome-screen";
import type { RagMessage } from "@/hooks/use-rag-messages";

interface ChatAreaProps {
  messages: RagMessage[];
  isLoadingMessages: boolean;
  isSending: boolean;
  onSendMessage: (message: string) => void;
}

export function ChatArea({
  messages,
  isLoadingMessages,
  isSending,
  onSendMessage,
}: ChatAreaProps) {
  const [input, setInput] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    onSendMessage(trimmed);
    setInput("");
  }, [input, isSending, onSendMessage]);

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages or Welcome Screen */}
      {!hasMessages && !isLoadingMessages ? (
        <WelcomeScreen onSelectPrompt={(prompt) => onSendMessage(prompt)} />
      ) : (
        <Conversation>
          <ConversationContent className="mx-auto w-full max-w-3xl px-4">
            {messages.map((msg) => (
              <Message key={msg.id} from={msg.role as "user" | "assistant"}>
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <BotIcon className="h-4 w-4 text-primary" />
                  </div>
                )}
                <MessageContent>
                  <MessageResponse>{msg.content}</MessageResponse>
                </MessageContent>
                {msg.role === "assistant" && (
                  <>
                    <SourceCitations sources={msg.sources} />
                    <MessageActions>
                      <MessageAction
                        tooltip="Copy"
                        onClick={() => handleCopy(msg.content)}
                      >
                        <CopyIcon className="h-3.5 w-3.5" />
                      </MessageAction>
                    </MessageActions>
                  </>
                )}
              </Message>
            ))}

            {/* Typing indicator */}
            {isSending && (
              <Message from="assistant">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <BotIcon className="h-4 w-4 text-primary" />
                </div>
                <MessageContent>
                  <div className="flex items-center gap-1.5 py-2">
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

      {/* Input */}
      <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
        <PromptInput
          value={input}
          onValueChange={setInput}
          isLoading={isSending}
          onSubmit={handleSubmit}
        >
          <PromptInputTextarea placeholder="Message Alleato AI..." />
          <PromptInputActions className="justify-end px-2 pb-2">
            <PromptInputAction tooltip={isSending ? "Stop" : "Send"}>
              <Button
                size="icon"
                variant={input.trim() ? "default" : "ghost"}
                className="h-8 w-8 rounded-full"
                disabled={!input.trim() && !isSending}
                onClick={isSending ? undefined : handleSubmit}
              >
                {isSending ? (
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
