"use client";

import { useCallback, useMemo } from "react";
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
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import {
  Suggestions,
  Suggestion,
} from "@/components/ai-elements/suggestion";
import { Loader } from "@/components/ai-elements/loader";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/chat/prompt-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CopyIcon,
  SendIcon,
  SquareIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  WrenchIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DatabaseIcon,
} from "lucide-react";
import { toast } from "sonner";
import { WelcomeScreen } from "./welcome-screen";
import { TracePanel, type ToolTraceItem } from "./trace-panel";
import { SourceCitations } from "./source-citations";

// ─── Part extraction helpers ───────────────────────────────────────

function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function getReasoningText(msg: UIMessage): string {
  return msg.parts
    .filter(
      (p): p is { type: "reasoning"; text: string } => p.type === "reasoning",
    )
    .map((p) => p.text)
    .join("");
}

// AI SDK v6 tool parts use type: "tool-{toolName}" with toolCallId, input, output, state
interface ToolPart {
  type: string;
  toolCallId: string;
  input: unknown;
  state: string;
  output?: unknown;
  errorText?: string;
  title?: string;
}

function getToolParts(msg: UIMessage): ToolPart[] {
  return msg.parts
    .filter((p) => p.type.startsWith("tool-"))
    .map((p) => p as unknown as ToolPart);
}

function hasToolInvocations(msg: UIMessage): boolean {
  return msg.parts.some((p) => p.type.startsWith("tool-"));
}

function getToolNameFromType(type: string): string {
  return type.replace(/^tool-/, "");
}

// ─── Formatting helpers ────────────────────────────────────────────

function formatToolName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ─── Tool call display ─────────────────────────────────────────────

function ToolCallItem({ part }: { part: ToolPart }) {
  const isCompleted = part.state === "output-available";
  const isError = part.state === "output-error";
  const isRunning = part.state === "input-available";
  const toolName = getToolNameFromType(part.type);

  return (
    <Collapsible className="group/tool not-prose mb-1.5 w-full">
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted/50">
        <WrenchIcon className="size-3.5 shrink-0" />
        <span className="text-xs">
          {formatToolName(toolName)}
        </span>
        {isCompleted ? (
          <CheckCircleIcon className="size-3.5 shrink-0 text-green-600" />
        ) : isError ? (
          <Badge
            variant="destructive"
            className="h-5 rounded-full px-1.5 text-[10px]"
          >
            Error
          </Badge>
        ) : isRunning ? (
          <Loader size={12} />
        ) : (
          <Loader size={12} />
        )}
        <ChevronDownIcon className="ml-auto size-3.5 shrink-0 transition-transform group-data-[state=open]/tool:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 px-2 pb-2 pt-1">
        {part.input != null ? (
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Parameters
            </p>
            <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
              {JSON.stringify(part.input, null, 2)}
            </pre>
          </div>
        ) : null}
        {isCompleted && part.output != null ? (
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Result
            </p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
              {typeof part.output === "string"
                ? part.output
                : JSON.stringify(part.output, null, 2)}
            </pre>
          </div>
        ) : null}
        {isError && part.errorText ? (
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-destructive">
              Error
            </p>
            <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {part.errorText}
            </pre>
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Streaming indicator ────────────────────────────────────────────

function StreamingIndicator({ hasToolCalls }: { hasToolCalls: boolean }) {
  return (
    <Message from="assistant">
      <MessageContent>
        <div className="flex items-center gap-2.5 py-1">
          {hasToolCalls ? (
            <>
              <DatabaseIcon className="h-4 w-4 animate-pulse text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Analyzing your project data...
              </span>
            </>
          ) : (
            <>
              <Loader size={14} />
              <span className="text-sm text-muted-foreground">
                Thinking...
              </span>
            </>
          )}
        </div>
      </MessageContent>
    </Message>
  );
}

// ─── Contextual suggestion generation ───────────────────────────────

function generateSuggestions(
  messages: UIMessage[],
  isStreaming: boolean,
): string[] {
  if (isStreaming || messages.length === 0) return [];

  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role !== "assistant") return [];

  const text = getMessageText(lastMsg).toLowerCase();
  const toolParts = getToolParts(lastMsg);
  const toolNames = toolParts.map((p) => getToolNameFromType(p.type));

  const suggestions: string[] = [];

  // Based on tools that were used
  if (toolNames.includes("getPortfolioOverview")) {
    suggestions.push("Which project needs the most attention?");
    suggestions.push("Show me the financial breakdown");
  }
  if (
    toolNames.includes("getFinancialAnalysis") ||
    toolNames.includes("getProjectBudgetSummary")
  ) {
    suggestions.push("What's our change order exposure?");
    suggestions.push("Compare budgets across projects");
  }
  if (toolNames.includes("getActionItemsAndInsights")) {
    suggestions.push("Which items are overdue?");
    suggestions.push("Help me prioritize these");
  }
  if (toolNames.includes("getProjectRiskAnalysis")) {
    suggestions.push("How can we mitigate these risks?");
    suggestions.push("Show me the financial details");
  }
  if (
    toolNames.includes("searchDocuments") ||
    toolNames.includes("getProjectDetails")
  ) {
    suggestions.push("What were the key decisions?");
    suggestions.push("Show me related action items");
  }

  // Based on content keywords
  if (suggestions.length < 3) {
    if (text.includes("meeting") || text.includes("oac")) {
      suggestions.push("Help me prepare talking points");
    }
    if (text.includes("budget") || text.includes("cost")) {
      suggestions.push("Break down the budget for me");
    }
    if (text.includes("risk") || text.includes("concern")) {
      suggestions.push("What's the mitigation plan?");
    }
    if (text.includes("action item") || text.includes("follow up")) {
      suggestions.push("Who's responsible for each?");
    }
  }

  // Fallback suggestions
  if (suggestions.length === 0) {
    suggestions.push("Tell me more");
    suggestions.push("What should I focus on this week?");
    suggestions.push("Any risks I should know about?");
  }

  // Deduplicate and limit to 4
  return [...new Set(suggestions)].slice(0, 4);
}

// ─── Main ChatArea component ────────────────────────────────────────

interface ChatAreaProps {
  messages: UIMessage[];
  toolTracesByMessageId?: Record<string, ToolTraceItem[]>;
  sourcesByMessageId?: Record<string, unknown[]>;
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
  sourcesByMessageId = {},
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

  const handleFeedback = useCallback((type: "up" | "down") => {
    toast.success(
      type === "up"
        ? "Thanks for the feedback!"
        : "Sorry about that — I'll do better.",
    );
  }, []);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      onSubmit(suggestion);
    },
    [onSubmit],
  );

  const hasMessages = messages.length > 0;

  // Determine streaming indicator visibility
  const lastMessage = messages[messages.length - 1];
  const lastMessageText = lastMessage ? getMessageText(lastMessage) : "";
  const lastIsAssistantWithToolCalls =
    lastMessage?.role === "assistant" && hasToolInvocations(lastMessage);
  const showStreamingIndicator =
    isStreaming &&
    messages.length > 0 &&
    (lastMessage?.role === "user" ||
      (lastIsAssistantWithToolCalls && !lastMessageText.trim()));

  // Generate contextual follow-up suggestions
  const suggestions = useMemo(
    () => generateSuggestions(messages, isStreaming),
    [messages, isStreaming],
  );

  // Shared prompt input element
  const promptInputEl = (
    <PromptInput
      value={input}
      onValueChange={onInputChange}
      isLoading={isStreaming}
      onSubmit={handleSubmit}
    >
      <PromptInputTextarea placeholder="Ask anything..." />
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
  );

  const poweredByEl = (
    <p className="mt-2 text-center text-xs text-muted-foreground/60">
      Powered by live project data
    </p>
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {!hasMessages && !isLoadingMessages ? (
        /* Welcome state — input centered with title & suggestions */
        <WelcomeScreen onSelectPrompt={(prompt) => onSubmit(prompt)}>
          {promptInputEl}
          {poweredByEl}
        </WelcomeScreen>
      ) : (
        <>
          <Conversation>
            <ConversationContent className="mx-auto w-full max-w-3xl px-4">
              {messages.map((msg, msgIndex) => {
                const text = getMessageText(msg);
                const isAssistant = msg.role === "assistant";
                const reasoningText = isAssistant ? getReasoningText(msg) : "";
                const toolParts = isAssistant
                  ? getToolParts(msg)
                  : [];
                const persistedTraces = toolTracesByMessageId[msg.id] ?? [];
                const persistedSources = sourcesByMessageId[msg.id] ?? [];
                const isLastMessage = msgIndex === messages.length - 1;

                // Show tool-only assistant messages with live tool call display
                if (isAssistant && !text.trim() && hasToolInvocations(msg)) {
                  if (toolParts.length > 0) {
                    return (
                      <Message key={msg.id} from="assistant">
                        <MessageContent>
                          {toolParts.map((part) => (
                            <ToolCallItem
                              key={part.toolCallId}
                              part={part}
                            />
                          ))}
                        </MessageContent>
                      </Message>
                    );
                  }
                  return null;
                }

                // Skip empty assistant messages
                if (isAssistant && !text.trim()) {
                  return null;
                }

                return (
                  <Message
                    key={msg.id}
                    from={msg.role as "user" | "assistant"}
                  >
                    <MessageContent>
                      {/* Reasoning / Thinking display */}
                      {isAssistant && reasoningText && (
                        <Reasoning
                          isStreaming={isStreaming && isLastMessage}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>
                            {reasoningText}
                          </ReasoningContent>
                        </Reasoning>
                      )}

                      {/* Live tool call display (during streaming) */}
                      {isAssistant && toolParts.length > 0 && (
                        <div className="mb-3">
                          {toolParts.map((part) => (
                            <ToolCallItem
                              key={part.toolCallId}
                              part={part}
                            />
                          ))}
                        </div>
                      )}

                      {/* Main text response */}
                      <MessageResponse>{text}</MessageResponse>

                      {/* Persisted tool traces (historical messages) */}
                      {isAssistant &&
                        toolParts.length === 0 &&
                        persistedTraces.length > 0 && (
                          <TracePanel traces={persistedTraces} />
                        )}

                      {/* Source citations */}
                      {isAssistant && persistedSources.length > 0 && (
                        <SourceCitations sources={persistedSources} />
                      )}
                    </MessageContent>

                    {/* Message actions: copy, thumbs up/down */}
                    {isAssistant && text && (
                      <MessageActions>
                        <MessageAction
                          tooltip="Copy"
                          onClick={() => handleCopy(text)}
                        >
                          <CopyIcon className="h-3.5 w-3.5" />
                        </MessageAction>
                        <MessageAction
                          tooltip="Good response"
                          onClick={() => handleFeedback("up")}
                        >
                          <ThumbsUpIcon className="h-3.5 w-3.5" />
                        </MessageAction>
                        <MessageAction
                          tooltip="Poor response"
                          onClick={() => handleFeedback("down")}
                        >
                          <ThumbsDownIcon className="h-3.5 w-3.5" />
                        </MessageAction>
                      </MessageActions>
                    )}
                  </Message>
                );
              })}

              {/* Streaming indicator */}
              {showStreamingIndicator && (
                <StreamingIndicator
                  hasToolCalls={lastIsAssistantWithToolCalls}
                />
              )}

              {/* Follow-up suggestions */}
              {!isStreaming && suggestions.length > 0 && (
                <div className="py-2">
                  <Suggestions>
                    {suggestions.map((suggestion) => (
                      <Suggestion
                        key={suggestion}
                        suggestion={suggestion}
                        onClick={handleSuggestionClick}
                      />
                    ))}
                  </Suggestions>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {/* Prompt input — pinned to bottom in conversation mode */}
          <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-2">
            {promptInputEl}
            {poweredByEl}
          </div>
        </>
      )}
    </div>
  );
}
