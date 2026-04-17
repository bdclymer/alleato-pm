"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { useProjects } from "@/hooks/use-projects";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  FileTextIcon,
  Building2Icon,
  ChevronDownIcon,
  CheckIcon,
  XIcon,
  SparkleIcon,
  LinkIcon,
  EraserIcon,
} from "lucide-react";
import type { DynamicToolUIPart } from "ai";
import { toast } from "sonner";
import { WelcomeScreen } from "./welcome-screen";
import { TracePanel, type ToolTraceItem } from "./trace-panel";
import { SourceCitations } from "./source-citations";
import { CrossSourceTimeline } from "./cross-source-timeline";

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

interface MemoryUsage {
  totalUsed: number;
  preferencesUsed?: number;
  relevantUsed?: number;
  teamUsed?: number;
  recentConversationsUsed?: number;
  memories?: Array<{
    id: string;
    type: string;
    content: string;
  }>;
}

export interface ResponseQuality {
  confidence: "high" | "medium" | "low";
  sourceQuality: "high" | "medium" | "low";
  score: number;
  reasons: string[];
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

/**
 * Parse an ISO date string into "Mar 16, 2026" format.
 * Returns null if unparseable.
 */
function formatSourceDate(str: string): string | null {
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

/**
 * Turn a raw [Source: ...] body into a human-readable label.
 * Handles:
 *   Meeting - "Title" - ISO-DATE
 *   Meeting - Title - ISO-DATE
 *   Project Directory - Name
 *   Action Items & Insights
 *   anything else → returned as-is
 */
function formatSourceLabel(raw: string): string {
  const meetingMatch = raw.match(
    /^Meeting\s*[-–]\s*"?([^"-]+?)"?\s*[-–]\s*(.+)$/,
  );
  if (meetingMatch) {
    const title = meetingMatch[1].trim();
    const dateStr = meetingMatch[2].trim();
    const date = formatSourceDate(dateStr);
    return date ? `${title} · ${date}` : title;
  }
  return raw;
}

/**
 * Extract all [Source: ...] patterns from text, returning the cleaned text
 * (with citations removed) and a deduplicated array of formatted source labels.
 */
function extractSources(text: string): { cleanText: string; sources: string[] } {
  const seen = new Set<string>();
  const sources: string[] = [];
  const cleanText = text.replace(/\[Source:\s*([^\]]+)\]/g, (_, content) => {
    const label = formatSourceLabel(content.trim());
    if (!seen.has(label)) {
      seen.add(label);
      sources.push(label);
    }
    return "";
  });
  return { cleanText: cleanText.replace(/\n{3,}/g, "\n\n").trim(), sources };
}

function formatToolName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getToolPreview(part: ToolPart): Record<string, unknown> | null {
  const output = asObject(part.output);
  if (output.action !== "preview") return null;
  const preview = asObject(output.preview);
  return Object.keys(preview).length > 0 ? preview : null;
}

function getToolOutputRecord(part: ToolPart): Record<string, unknown> | null {
  const output = asObject(part.output);
  const record = asObject(output.record);
  return Object.keys(record).length > 0 ? record : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function getRecordDeepLinks(part: ToolPart): Array<{ label: string; href: string }> {
  const input = asObject(part.input);
  const record = getToolOutputRecord(part);
  const output = asObject(part.output);
  const links: Array<{ label: string; href: string }> = [];

  const projectId =
    toNumber(input.projectId) ??
    toNumber((record as Record<string, unknown>)?.project_id);
  const recordId =
    toStringValue((record as Record<string, unknown>)?.id) ??
    toStringValue(output.documentId);

  const toolName = getToolNameFromType(part.type);

  if (toolName === "createRFI" && projectId && recordId) {
    links.push({ label: "Open RFI", href: `/${projectId}/rfis/${recordId}` });
  }

  if (toolName === "createSubmittal" && projectId && recordId) {
    links.push({
      label: "Open Submittal",
      href: `/${projectId}/submittals/${recordId}`,
    });
  }

  if (toolName === "createChangeOrder" && projectId && recordId) {
    links.push({
      label: "Open Change Order",
      href: `/${projectId}/change-orders/prime/${recordId}`,
    });
  }

  if (toolName === "createChangeEvent" && projectId && recordId) {
    links.push({
      label: "Open Change Event",
      href: `/${projectId}/change-events/${recordId}`,
    });
  }

  if (toolName === "createMeetingNote" && projectId && recordId) {
    links.push({
      label: "Open Meeting",
      href: `/${projectId}/meetings/${recordId}`,
    });
  }

  if (toolName === "updateProjectStatus" && projectId) {
    links.push({ label: "Open Project", href: `/${projectId}/home` });
  }

  if (recordId && output.boardUrl && typeof output.boardUrl === "string") {
    links.push({
      label: "Open Board Card",
      href: String(output.boardUrl),
    });
  }

  return links;
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
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/60">
      {councilMode ? (
        <SparkleIcon className="h-4 w-4 text-primary" />
      ) : (
        <SparklesIcon className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}

// ─── Tool call display ─────────────────────────────────────────────

function ToolCallItem({
  part,
  onApprove,
  onEdit,
  onRun,
}: {
  part: ToolPart;
  onApprove: (part: ToolPart) => void;
  onEdit: (part: ToolPart) => void;
  onRun: (part: ToolPart) => void;
}) {
  const preview = getToolPreview(part);
  const previewFields = asObject(preview?.fields);
  const previewEntries = Object.entries(previewFields);
  const links = getRecordDeepLinks(part);

  return (
    <ToolDisplay className="mb-1.5">
      <ToolHeader
        type={part.type as DynamicToolUIPart["type"]}
        state={part.state as DynamicToolUIPart["state"]}
        toolName={getToolNameFromType(part.type)}
        title={formatToolName(getToolNameFromType(part.type))}
      />
      <ToolContent>
        {part.input != null && <ToolInput input={part.input} />}
        {preview && (
          <div className="space-y-2 rounded-md border border-border/60 bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pending Write
            </p>
            {previewEntries.length > 0 && (
              <div className="space-y-1">
                {previewEntries.slice(0, 8).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="w-2/3 break-words text-right text-foreground">
                      {typeof value === "string"
                        ? value
                        : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onApprove(part)}
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onEdit(part)}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-xs"
                onClick={() => onRun(part)}
              >
                Run
              </Button>
            </div>
          </div>
        )}
        {(part.state === "output-available" || part.state === "output-error") && (
          <ToolOutput output={part.output} errorText={part.errorText} />
        )}
        {links.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {links.map((link) => (
              <Link
                key={`${link.label}-${link.href}`}
                href={link.href}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-muted"
              >
                <LinkIcon className="h-3 w-3" />
                {link.label}
              </Link>
            ))}
          </div>
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

function MemoryUsageBadge({
  usage,
  onForget,
}: {
  usage: MemoryUsage;
  onForget: (memoryId: string) => Promise<void>;
}) {
  const [isForgetting, setIsForgetting] = useState(false);
  const memories = usage.memories ?? [];

  const handleForget = async () => {
    if (isForgetting || memories.length === 0) return;
    setIsForgetting(true);
    try {
      await Promise.all(memories.slice(0, 3).map((m) => onForget(m.id)));
      toast.success("Removed selected memories");
    } catch {
      toast.error("Failed to forget memories");
    } finally {
      setIsForgetting(false);
    }
  };

  return (
    <div className="mt-2 space-y-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
      <p className="text-xs text-muted-foreground">
        Used {usage.totalUsed} memories
        {usage.recentConversationsUsed
          ? ` + ${usage.recentConversationsUsed} recent conversation summaries`
          : ""}
      </p>
      {memories.length > 0 && (
        <div className="space-y-1">
          {memories.slice(0, 3).map((memory) => (
            <p key={memory.id} className="line-clamp-1 text-xs text-foreground/90">
              {memory.content}
            </p>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => toast.success("Keeping these memories")}
        >
          Keep
        </Button>
        <Link
          href="/settings/memory"
          className="inline-flex h-7 items-center rounded-md border border-border px-2 text-xs text-foreground hover:bg-muted"
        >
          Edit
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
          onClick={handleForget}
          disabled={isForgetting || memories.length === 0}
        >
          <EraserIcon className="mr-1 h-3 w-3" />
          Forget
        </Button>
      </div>
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
  const previousUserMessage = [...messages]
    .reverse()
    .find((msg) => msg.role === "user");
  const userIntentText = previousUserMessage
    ? getMessageText(previousUserMessage).toLowerCase()
    : "";
  const outputs = toolParts.map((part) => asObject(part.output));
  const hasPreview = outputs.some((output) => output.action === "preview");
  const hasSuccessfulWrite = outputs.some(
    (output) => output.success === true && output.record && typeof output.record === "object",
  );
  const hasErrors = outputs.some((output) => Boolean(output.error)) ||
    toolParts.some((part) => part.state === "output-error");

  // ── Project disambiguation: extract project names as clickable chips ──
  const projectChoices = extractProjectChoices(text);
  if (projectChoices.length >= 2) {
    // The AI asked "which project?" — show project names as quick-pick buttons
    return projectChoices.map(
      (name) => `Tell me about ${name}`,
    ).slice(0, 5);
  }

  const suggestions: string[] = [];

  // Outcome-first suggestions
  if (hasPreview) {
    suggestions.push("Approve and run this draft");
    suggestions.push("Edit the draft fields before running");
    suggestions.push("What changes do you recommend before we execute?");
  }

  if (hasSuccessfulWrite) {
    suggestions.push("What should I do next after this update?");
    suggestions.push("Show related records that may be impacted");
  }

  if (hasErrors) {
    suggestions.push("Retry with safer defaults");
    suggestions.push("Explain exactly why that failed");
  }

  // Intent + tool outcome blend
  if (userIntentText.includes("timeline") || userIntentText.includes("across sources")) {
    suggestions.push("Show a cross-source timeline for the last 14 days");
    suggestions.push("Filter the timeline to only meetings and AI insights");
  }

  if (userIntentText.includes("rfi") || userIntentText.includes("submittal")) {
    suggestions.push("Show overdue RFIs and submittals only");
  }

  if (userIntentText.includes("change order") || userIntentText.includes("co")) {
    suggestions.push("Summarize pending change orders by project");
  }

  if (userIntentText.includes("email") || userIntentText.includes("teams")) {
    suggestions.push("Find communications that conflict with meeting decisions");
  }

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
  memoryUsageByMessageId?: Record<string, MemoryUsage>;
  responseQualityByMessageId?: Record<string, ResponseQuality>;
  isLoadingMessages: boolean;
  isStreaming: boolean;
  input: string;
  sessionId?: string;
  councilMode?: boolean;
  onCouncilModeChange?: (val: boolean) => void;
  selectedProjectId?: number | null;
  onProjectChange?: (id: number | null) => void;
  onInputChange: (value: string) => void;
  onSubmit: (message: string) => void;
  onStop: () => void;
}

export function ChatArea({
  messages,
  toolTracesByMessageId = {},
  sourcesByMessageId = {},
  memoryUsageByMessageId = {},
  responseQualityByMessageId = {},
  isLoadingMessages,
  isStreaming,
  input,
  sessionId,
  councilMode: councilModeProp,
  onCouncilModeChange,
  selectedProjectId: selectedProjectIdProp,
  onProjectChange,
  onInputChange,
  onSubmit,
  onStop,
}: ChatAreaProps) {
  // Council mode can be controlled externally (via prop) or internally
  const [councilModeInternal, setCouncilModeInternal] = useState(false);

  // Project selector
  const [projectOpen, setProjectOpen] = useState(false);
  const { projects, isLoading: projectsLoading } = useProjects({ limit: 50 });
  const selectedProject = projects.find((p) => p.id === selectedProjectIdProp) ?? null;
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
        apiFetch("/api/ai-assistant/feedback", {
          method: "POST",
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

  const handleToolApprove = useCallback(
    (part: ToolPart) => {
      const toolName = formatToolName(getToolNameFromType(part.type));
      onSubmit(`I approve this ${toolName} preview. Run it now exactly as shown.`);
    },
    [onSubmit],
  );

  const handleToolEdit = useCallback(
    (part: ToolPart) => {
      const preview = getToolPreview(part);
      const fields = asObject(preview?.fields);
      const toolName = formatToolName(getToolNameFromType(part.type));
      onInputChange(
        `Edit this ${toolName} before running:\n${JSON.stringify(fields, null, 2)}`,
      );
    },
    [onInputChange],
  );

  const handleToolRun = useCallback(
    (part: ToolPart) => {
      const toolName = formatToolName(getToolNameFromType(part.type));
      onSubmit(
        `Run ${toolName} now with confirmed=true using the same preview values.`,
      );
    },
    [onSubmit],
  );

  const handleForgetMemory = useCallback(async (memoryId: string) => {
    await apiFetch(`/api/ai-assistant/memories/${memoryId}`, {
      method: "DELETE",
    });
  }, []);

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
      className={cn(
        "rounded-[1.5rem] border-0 bg-background px-2.5 py-2 shadow-sm sm:rounded-[1.75rem] sm:px-3",
        hasMessages && "rounded-[1.75rem]",
      )}
    >
      <PromptInputTextarea
        placeholder={
          councilMode
            ? "Ask the council for a recommendation..."
            : "How can I help with your projects today?"
        }
        className="min-h-11 px-2 pb-1.5 pt-1.5 text-sm leading-6 placeholder:text-muted-foreground/80 sm:min-h-12 sm:text-[15px]"
      />
      <PromptInputActions className="flex items-center justify-between gap-2 px-1 pb-1">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Popover open={projectOpen} onOpenChange={setProjectOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-transparent px-2.5 py-1.5 text-xs font-medium transition-colors",
                  selectedProject
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-label="Select project context"
              >
                <Building2Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-24 truncate sm:max-w-36">
                  {selectedProject ? (selectedProject.name ?? "Project") : "All projects"}
                </span>
                {selectedProject ? (
                  <XIcon
                    className="h-3.5 w-3.5 shrink-0 opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onProjectChange?.(null);
                    }}
                  />
                ) : (
                  <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start" side="top">
              <Command>
                <CommandInput placeholder="Search projects…" className="h-9" />
                <CommandList>
                  <CommandEmpty>
                    {projectsLoading ? "Loading…" : "No projects found"}
                  </CommandEmpty>
                  <CommandGroup>
                    {projects.map((project) => (
                      <CommandItem
                        key={project.id}
                        value={`${project.name ?? ""} ${project.project_number ?? ""}`}
                        onSelect={() => {
                          onProjectChange?.(project.id === selectedProjectIdProp ? null : project.id);
                          setProjectOpen(false);
                        }}
                      >
                        <span className="flex-1 truncate">{project.name}</span>
                        {project.project_number && (
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                            #{project.project_number}
                          </span>
                        )}
                        {project.id === selectedProjectIdProp && (
                          <CheckIcon className="ml-2 h-3.5 w-3.5 shrink-0 text-primary" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant="ghost"
            role="switch"
            aria-checked={councilMode}
            onClick={handleCouncilToggle}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-transparent px-2.5 py-1.5 text-xs font-medium transition-colors",
              councilMode
                ? "text-foreground"
                : "text-foreground",
            )}
          >
            <span
              className={cn(
                "inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
                councilMode ? "bg-primary/20" : "bg-background/80",
              )}
            >
              <span
                className={cn(
                  "h-4 w-4 rounded-full transition-transform duration-200",
                  councilMode
                    ? "translate-x-4 bg-primary shadow-sm"
                    : "bg-muted-foreground/70",
                )}
              />
            </span>
            Council Mode
          </Button>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <PromptInputAction tooltip={isStreaming ? "Stop" : "Send"}>
            <Button
              size="icon"
              variant={input.trim() ? "default" : "ghost"}
              className="h-9 w-9 rounded-full"
              disabled={!input.trim() && !isStreaming}
              onClick={isStreaming ? onStop : handleSubmit}
            >
              {isStreaming ? (
                <SquareIcon />
              ) : (
                <SendIcon />
              )}
            </Button>
          </PromptInputAction>
        </div>
      </PromptInputActions>
    </PromptInput>
  );

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      {!hasMessages && !isLoadingMessages ? (
        <div className="flex min-h-0 flex-1 pb-36 md:pb-40">
          <WelcomeScreen onSelectPrompt={(prompt) => onSubmit(prompt)} />
        </div>
      ) : (
        <>
          <Conversation className="min-h-0">
            <ConversationContent className="mx-auto w-full max-w-4xl px-4 pb-36 pt-6 md:px-6 md:pb-40 md:pt-8">
              {messages.map((msg, msgIndex) => {
                const text = getMessageText(msg);
                const isAssistant = msg.role === "assistant";
                const { cleanText: textWithoutSources, sources: inlineSources } = isAssistant
                  ? extractSources(text)
                  : { cleanText: text, sources: [] };
                const formattedAssistantText = isAssistant
                  ? formatStructuredMeetingList(textWithoutSources)
                  : text;
                const reasoningText = isAssistant ? getReasoningText(msg) : "";
                const toolParts = isAssistant
                  ? getToolParts(msg)
                  : [];
                const persistedTraces = toolTracesByMessageId[msg.id] ?? [];
                const persistedSources = sourcesByMessageId[msg.id] ?? [];
                const memoryUsage = memoryUsageByMessageId[msg.id];
                const responseQuality = responseQualityByMessageId[msg.id];
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
                              <ToolCallItem
                                part={toolParts[0]}
                                onApprove={handleToolApprove}
                                onEdit={handleToolEdit}
                                onRun={handleToolRun}
                              />
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
                      <MessageContent className="rounded-[1.4rem] border border-border/60 bg-muted/40 px-4 py-3 shadow-none sm:px-5">
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
                        <MessageContent className="px-1 py-1 sm:px-2">
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
                              <ToolCallItem
                                part={toolParts[0]}
                                onApprove={handleToolApprove}
                                onEdit={handleToolEdit}
                                onRun={handleToolRun}
                              />
                            </div>
                          ) : null}

                          {/* Main text response */}
                          <MessageResponse className="text-sm leading-6">
                            {formattedAssistantText}
                          </MessageResponse>

                          {responseQuality && (
                            <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                              <span>
                                Confidence: <span className="font-medium">{responseQuality.confidence}</span>
                              </span>
                              <span>•</span>
                              <span>
                                Sources: <span className="font-medium">{responseQuality.sourceQuality}</span>
                              </span>
                            </div>
                          )}

                          {/* Source citations — rendered as subtle chips */}
                          {inlineSources.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {inlineSources.map((src) => (
                                <span
                                  key={src}
                                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                                >
                                  <FileTextIcon className="h-3 w-3 shrink-0 opacity-60" />
                                  {src}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Persisted tool traces (historical messages) */}
                          {toolParts.length === 0 &&
                            persistedTraces.length > 0 && (
                              <TracePanel traces={persistedTraces} />
                            )}

                          {/* Source citations */}
                          {persistedSources.length > 0 && (
                            <SourceCitations sources={persistedSources} />
                          )}

                          {memoryUsage && (
                            <MemoryUsageBadge
                              usage={memoryUsage}
                              onForget={handleForgetMemory}
                            />
                          )}
                        </MessageContent>

                        {/* Message actions: copy, thumbs up/down (hover-only) */}
                        {text && (
                          <MessageActions className="opacity-100">
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

              {!isStreaming && hasMessages && (
                <div className="pl-11">
                  <CrossSourceTimeline projectId={selectedProjectIdProp} />
                </div>
              )}

              {/* Follow-up suggestions */}
              {!isStreaming && suggestions.length > 0 && (
                <div className="py-2 pl-11">
                  <Suggestions>
                    {suggestions.map((suggestion) => (
                      <Suggestion
                        key={suggestion}
                        suggestion={suggestion}
                        onClick={handleSuggestionClick}
                        className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
                      />
                    ))}
                  </Suggestions>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton className="bottom-28 md:bottom-28" />
          </Conversation>
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 z-20 shrink-0 bg-background/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur md:px-4">
        <div className="mx-auto w-full max-w-3xl">
          {promptInputEl}
        </div>
      </div>
    </div>
  );
}
