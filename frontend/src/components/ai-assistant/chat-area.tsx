"use client";

import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
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
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool as ToolDisplay,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/chat/prompt-input";
import { Button } from "@/components/ui/button";
import {
  CopyIcon,
  SendIcon,
  SquareIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  DatabaseIcon,
  SparklesIcon,
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

/**
 * Normalize numbered meeting summaries into a clearer layout:
 * "1. **Meeting Name** - details" => "### 1. Meeting Name\n\ndetails"
 */
function formatStructuredMeetingList(text: string): string {
  if (!text.includes("\n") || !text.includes("1.")) return text;

  const lines = text.split("\n");
  const linePattern =
    /^(\d+)\.\s*(?:\*\*([^*]+)\*\*|([^—–:\-]+))\s*[—–:\-]\s*(.+)$/;

  const matches = lines
    .map((line, index) => ({ line, index, match: line.match(linePattern) }))
    .filter((item) => item.match);

  // Only transform when this really looks like a meeting/results list.
  if (matches.length < 2) return text;

  const firstMatchIndex = matches[0].index;
  const before = lines.slice(0, firstMatchIndex).join("\n").trim();
  const transformed = matches
    .map((item) => {
      const match = item.match;
      if (!match) return item.line;
      const num = match[1];
      const title = (match[2] ?? match[3] ?? "").trim();
      const description = match[4].trim();
      return `### ${num}. ${title}\n\n${description}`;
    })
    .join("\n\n");

  return before ? `${before}\n\n${transformed}` : transformed;
}

// ─── Assistant Avatar ───────────────────────────────────────────────

function AssistantAvatar({ councilMode }: { councilMode?: boolean }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
      {councilMode ? (
        <span className="text-[13px] leading-none">⚡</span>
      ) : (
        <SparklesIcon className="h-3.5 w-3.5 text-primary" />
      )}
    </div>
  );
}

// ─── Tool call display ─────────────────────────────────────────────

function ToolCallItem({ part }: { part: ToolPart }) {
  return (
    <ToolDisplay className="mb-1.5">
      <ToolHeader
        type={part.type as "tool-invocation"}
        state={part.state as "input-available"}
        title={formatToolName(getToolNameFromType(part.type))}
      />
      <ToolContent>
        {part.input != null && <ToolInput input={part.input} />}
        {(part.state === "output-available" || part.state === "output-error") && (
          <ToolOutput output={part.output} errorText={part.errorText} />
        )}
      </ToolContent>
    </ToolDisplay>
  );
}

// ─── Tool step status helper ──────────────────────────────────────

function getToolStepStatus(state: string): "complete" | "active" | "pending" {
  if (state === "output-available" || state === "output-error") return "complete";
  if (state === "input-available" || state === "input-streaming") return "active";
  return "pending";
}

// ─── Streaming indicator ────────────────────────────────────────────

function StreamingIndicator({
  hasToolCalls,
  councilMode,
}: {
  hasToolCalls: boolean;
  councilMode?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar councilMode={councilMode} />
      <Message from="assistant">
        <MessageContent>
          <div className="flex items-center gap-2.5 py-1">
            {hasToolCalls ? (
              <>
                <DatabaseIcon className="h-4 w-4 animate-pulse text-muted-foreground" />
                <Shimmer as="span" duration={1.5} className="text-sm">
                  {councilMode
                    ? "Convening the council…"
                    : "Analyzing your project data..."}
                </Shimmer>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "0ms" }} />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "150ms" }} />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </div>
        </MessageContent>
      </Message>
    </div>
  );
}

// ─── Contextual suggestion generation ───────────────────────────────

/**
 * Detect project disambiguation patterns in assistant responses.
 * When the AI lists numbered projects for the user to pick from,
 * extract project names so we can render them as clickable chips.
 */
function extractProjectChoices(text: string): string[] {
  // Strategy 1: Match numbered list like "1. **Project Name** — description"
  const numberedMatches = text.match(
    /\d+\.\s+\*{0,2}([^*\n—–-]+?)\*{0,2}\s*[—–-]/g,
  );
  if (numberedMatches && numberedMatches.length >= 2) {
    return numberedMatches
      .map((m) =>
        m
          .replace(/^\d+\.\s+/, "")
          .replace(/\*+/g, "")
          .replace(/\s*[—–-].*$/, "")
          .trim(),
      )
      .filter((name) => name.length > 0 && name.length < 60)
      .slice(0, 5);
  }

  // Strategy 2: Match inline list like "projects like X, Y, Z, and W" or
  // "data for projects like X, Y, Z, and W" or "projects such as X, Y, and Z"
  const inlineMatch = text.match(
    /projects?\s+(?:like|such as|including)\s+([^.?!]+)/i,
  );
  if (inlineMatch) {
    const listText = inlineMatch[1];
    // Split on ", " and " and " to get individual project names
    const names = listText
      .split(/,\s*(?:and\s+)?|\s+and\s+/)
      .map((n) => n.replace(/\*+/g, "").trim())
      .filter((n) => n.length > 2 && n.length < 60);
    if (names.length >= 2) return names.slice(0, 5);
  }

  // Strategy 3: Match "Westfield Collective, Vermillion Rise Warehouse, ..."
  // when preceded by disambiguation-like phrases
  const disambigMatch = text.match(
    /(?:have data (?:on|for)|contracting data for|active projects?:?)\s+([A-Z][^.?!]{10,})/i,
  );
  if (disambigMatch) {
    const listText = disambigMatch[1];
    const names = listText
      .split(/,\s*(?:and\s+)?|\s+and\s+/)
      .map((n) => n.replace(/\*+/g, "").trim())
      .filter((n) => n.length > 2 && n.length < 60 && /^[A-Z]/.test(n));
    if (names.length >= 2) return names.slice(0, 5);
  }

  return [];
}

function generateSuggestions(
  messages: UIMessage[],
  isStreaming: boolean,
): string[] {
  if (isStreaming || messages.length === 0) return [];

  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role !== "assistant") return [];

  const text = getMessageText(lastMsg);
  const textLower = text.toLowerCase();
  const toolParts = getToolParts(lastMsg);
  const toolNames = toolParts.map((p) => getToolNameFromType(p.type));

  // ── Project disambiguation: extract project names as clickable chips ──
  const projectChoices = extractProjectChoices(text);
  if (projectChoices.length >= 2) {
    // The AI asked "which project?" — show project names as quick-pick buttons
    return projectChoices.map(
      (name) => `Tell me about ${name}`,
    ).slice(0, 5);
  }

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

  // Acumatica ERP tools
  if (
    toolNames.some((n) => n.startsWith("getAcumatica") || n.startsWith("getAP") || n.startsWith("getAR"))
  ) {
    suggestions.push("Show me the ERP budget details");
    suggestions.push("What's our cash position?");
  }

  // Based on content keywords
  if (suggestions.length < 3) {
    if (textLower.includes("meeting") || textLower.includes("oac")) {
      suggestions.push("Help me prepare talking points");
    }
    if (textLower.includes("budget") || textLower.includes("cost")) {
      suggestions.push("Break down the budget for me");
    }
    if (textLower.includes("risk") || textLower.includes("concern")) {
      suggestions.push("What's the mitigation plan?");
    }
    if (textLower.includes("action item") || textLower.includes("follow up")) {
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
  sessionId?: string;
  councilMode?: boolean;
  onCouncilModeChange?: (val: boolean) => void;
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
  sessionId,
  councilMode: councilModeProp,
  onCouncilModeChange,
  onInputChange,
  onSubmit,
  onStop,
}: ChatAreaProps) {
  // Council mode can be controlled externally (via prop) or internally
  const [councilModeInternal, setCouncilModeInternal] = useState(false);
  const councilMode = councilModeProp ?? councilModeInternal;
  const handleCouncilToggle = useCallback(() => {
    const next = !councilMode;
    setCouncilModeInternal(next);
    onCouncilModeChange?.(next);
  }, [councilMode, onCouncilModeChange]);
  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSubmit(trimmed);
  }, [input, isStreaming, onSubmit]);

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  }, []);

  const handleFeedback = useCallback(
    (type: "up" | "down", messageContent?: string) => {
      toast.success(
        type === "up"
          ? "Thanks for the feedback!"
          : "Sorry about that — I'll do better.",
      );
      // Persist feedback to database for AI observability
      if (sessionId) {
        fetch("/api/ai-assistant/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            feedback: type,
            messageContent: messageContent?.slice(0, 500),
          }),
        }).catch(() => {
          // Silent fail — feedback is best-effort
        });
      }
    },
    [sessionId],
  );

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
      <PromptInputTextarea placeholder={councilMode ? "Ask the C-Suite anything…" : "Ask anything about your projects..."} />
      <PromptInputActions className="justify-between px-2 pb-2">
        {/* Council Mode toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Council Mode</span>
          <button
            type="button"
            role="switch"
            aria-checked={councilMode}
            onClick={handleCouncilToggle}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none",
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
    <p className="mt-2 text-center text-xs text-muted-foreground/50">
      Powered by live project data
    </p>
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[hsl(var(--surface-alt))]">
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
                const formattedAssistantText = isAssistant
                  ? formatStructuredMeetingList(text)
                  : text;
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
                      <div key={msg.id} className="flex items-start gap-3">
                        <AssistantAvatar councilMode={councilMode} />
                        <Message from="assistant">
                          <MessageContent>
                            {toolParts.length > 1 ? (
                              <ChainOfThought defaultOpen>
                                <ChainOfThoughtHeader>Analysis Steps</ChainOfThoughtHeader>
                                <ChainOfThoughtContent>
                                  {toolParts.map((part) => (
                                    <ChainOfThoughtStep
                                      key={part.toolCallId}
                                      label={formatToolName(getToolNameFromType(part.type))}
                                      status={getToolStepStatus(part.state)}
                                    />
                                  ))}
                                </ChainOfThoughtContent>
                              </ChainOfThought>
                            ) : (
                              <ToolCallItem part={toolParts[0]} />
                            )}
                          </MessageContent>
                        </Message>
                      </div>
                    );
                  }
                  return null;
                }

                // Skip empty assistant messages
                if (isAssistant && !text.trim()) {
                  return null;
                }

                // User messages — right-aligned bubble
                if (!isAssistant) {
                  return (
                    <Message
                      key={msg.id}
                      from="user"
                    >
                      <MessageContent>
                        <MessageResponse>{text}</MessageResponse>
                      </MessageContent>
                    </Message>
                  );
                }

                // Assistant messages — left-aligned with avatar
                return (
                  <div key={msg.id} className="flex items-start gap-3">
                    <AssistantAvatar councilMode={councilMode} />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Message from="assistant">
                        <MessageContent>
                          {/* Reasoning / Thinking display */}
                          {reasoningText && (
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
                          {toolParts.length > 1 ? (
                            <div className="mb-3">
                              <ChainOfThought defaultOpen={isStreaming && isLastMessage}>
                                <ChainOfThoughtHeader>Analysis Steps</ChainOfThoughtHeader>
                                <ChainOfThoughtContent>
                                  {toolParts.map((part) => (
                                    <ChainOfThoughtStep
                                      key={part.toolCallId}
                                      label={formatToolName(getToolNameFromType(part.type))}
                                      status={getToolStepStatus(part.state)}
                                    />
                                  ))}
                                </ChainOfThoughtContent>
                              </ChainOfThought>
                            </div>
                          ) : toolParts.length === 1 ? (
                            <div className="mb-3">
                              <ToolCallItem part={toolParts[0]} />
                            </div>
                          ) : null}

                          {/* Main text response */}
                          <MessageResponse>{formattedAssistantText}</MessageResponse>

                          {/* Persisted tool traces (historical messages) */}
                          {toolParts.length === 0 &&
                            persistedTraces.length > 0 && (
                              <TracePanel traces={persistedTraces} />
                            )}

                          {/* Source citations */}
                          {persistedSources.length > 0 && (
                            <SourceCitations sources={persistedSources} />
                          )}
                        </MessageContent>

                        {/* Message actions: copy, thumbs up/down (hover-only) */}
                        {text && (
                          <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
                            <MessageAction
                              tooltip="Copy"
                              onClick={() => handleCopy(text)}
                            >
                              <CopyIcon className="h-3.5 w-3.5" />
                            </MessageAction>
                            <MessageAction
                              tooltip="Good response"
                              onClick={() => handleFeedback("up", text)}
                            >
                              <ThumbsUpIcon className="h-3.5 w-3.5" />
                            </MessageAction>
                            <MessageAction
                              tooltip="Poor response"
                              onClick={() => handleFeedback("down", text)}
                            >
                              <ThumbsDownIcon className="h-3.5 w-3.5" />
                            </MessageAction>
                          </MessageActions>
                        )}
                      </Message>
                    </div>
                  </div>
                );
              })}

              {/* Streaming indicator */}
              {showStreamingIndicator && (
                <StreamingIndicator
                  hasToolCalls={lastIsAssistantWithToolCalls}
                  councilMode={councilMode}
                />
              )}

              {/* Follow-up suggestions */}
              {!isStreaming && suggestions.length > 0 && (
                <div className="py-2 pl-10">
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
