"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiFetch, apiFetchBlob } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  AI_ASSISTANT_MODELS,
  DEFAULT_AI_ASSISTANT_MODEL,
  type AiAssistantModelId,
} from "@/lib/ai/assistant-models";
import type { UIMessage } from "ai";
import { useProjects } from "@/hooks/use-projects";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
  type ConfirmationProps,
} from "@/components/ai-elements/confirmation";
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
import { Input } from "@/components/ui/input";
import {
  CopyIcon,
  SendIcon,
  SquareIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  DatabaseIcon,
  FileTextIcon,
  FolderIcon,
  CheckIcon,
  XIcon,
  SparkleIcon,
  LinkIcon,
  EraserIcon,
  MicIcon,
  MicOffIcon,
  PaperclipIcon,
  BrainIcon,
  UsersRoundIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import type { DynamicToolUIPart } from "ai";
import { toast } from "sonner";
import { WelcomeScreen } from "./welcome-screen";
import { TracePanel, type ToolTraceItem } from "./trace-panel";
import { SourceCitations } from "./source-citations";
import { CrossSourceTimeline } from "./cross-source-timeline";
import { formatStructuredMeetingList } from "./chat-formatting";
import { AnimatedOrb } from "./animated-orb";
import { AudioWaveform } from "./audio-waveform";

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

function getImageParts(
  msg: UIMessage,
): Array<{ url: string; filename?: string }> {
  return msg.parts.reduce<Array<{ url: string; filename?: string }>>(
    (images, part) => {
      if (part.type !== "file") return images;
      const filePart = part as {
        type: "file";
        mediaType?: string;
        url?: string;
        filename?: string;
      };
      if (filePart.mediaType?.startsWith("image/") && filePart.url) {
        images.push({
          url: filePart.url,
          filename: filePart.filename,
        });
      }
      return images;
    },
    [],
  );
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
  approval?: {
    id: string;
    approved?: boolean;
    reason?: string;
  };
}

type ToolApprovalResponseHandler = (response: {
  id: string;
  approved: boolean;
  reason?: string;
}) => void;

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

type WindowWithSpeechRecognition = {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export interface ResponseQuality {
  confidence: "high" | "medium" | "low";
  sourceQuality: "high" | "medium" | "low";
  score: number;
  reasons: string[];
}

export interface StrategistLiveStatus {
  stage: string;
  message: string;
  status: "loading" | "success" | "warning" | "error";
  timestamp?: string;
}

function getToolParts(msg: UIMessage): ToolPart[] {
  return msg.parts
    .filter((p) => p.type.startsWith("tool-"))
    .map((p) => p as unknown as ToolPart);
}

function getLatestStatusPart(msg: UIMessage): StrategistLiveStatus | null {
  for (const part of [...msg.parts].reverse()) {
    if (part.type !== "data-status") continue;
    const data = (part as { data?: unknown }).data;
    if (!data || typeof data !== "object") continue;
    const record = data as Record<string, unknown>;
    if (typeof record.message !== "string" || typeof record.stage !== "string") continue;
    return {
      stage: record.stage,
      message: record.message,
      status:
        record.status === "success" ||
        record.status === "warning" ||
        record.status === "error"
          ? record.status
          : "loading",
      timestamp: typeof record.timestamp === "string" ? record.timestamp : undefined,
    };
  }

  return null;
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

function isTextReadableAttachment(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    file.type === "application/xml" ||
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    name.endsWith(".csv") ||
    name.endsWith(".json") ||
    name.endsWith(".xml") ||
    name.endsWith(".txt")
  );
}

async function prepareMessageWithReadableAttachments(
  message: string,
  files: FileList | undefined,
): Promise<{ message: string; files?: FileList }> {
  if (!files?.length) return { message, files };

  const readableFiles = Array.from(files).filter(isTextReadableAttachment);
  if (readableFiles.length === 0) return { message, files };

  const attachmentText = await Promise.all(
    readableFiles.map(async (file) => {
      const text = await file.text();
      return [
        `--- ${file.name} (${file.type || "text/plain"}) ---`,
        text,
        `--- end ${file.name} ---`,
      ].join("\n");
    }),
  );
  const transfer = new DataTransfer();
  Array.from(files)
    .filter((file) => !isTextReadableAttachment(file))
    .forEach((file) => transfer.items.add(file));

  return {
    message: [message, "Attached readable files:", ...attachmentText]
      .filter(Boolean)
      .join("\n\n"),
    files: transfer.files.length > 0 ? transfer.files : undefined,
  };
}

// ─── Assistant Avatar ───────────────────────────────────────────────

function AssistantAvatar({ councilMode }: { councilMode?: boolean }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border/50">
      {councilMode ? (
        <SparkleIcon className="absolute h-3.5 w-3.5 text-primary" />
      ) : (
        <AnimatedOrb size={32} />
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
  onApprovalResponse,
}: {
  part: ToolPart;
  onApprove: (part: ToolPart) => void;
  onEdit: (part: ToolPart) => void;
  onRun: (part: ToolPart) => void;
  onApprovalResponse?: ToolApprovalResponseHandler;
}) {
  const preview = getToolPreview(part);
  const previewFields = asObject(preview?.fields);
  const previewEntries = Object.entries(previewFields);
  const links = getRecordDeepLinks(part);
  const approvalId = part.approval?.id;

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
        <Confirmation
          approval={part.approval as ConfirmationProps["approval"]}
          state={part.state as DynamicToolUIPart["state"]}
        >
          <ConfirmationRequest>
            <ConfirmationTitle>
              This action requires approval before it can run.
            </ConfirmationTitle>
            <ConfirmationActions>
              <ConfirmationAction
                variant="outline"
                disabled={!approvalId}
                onClick={() => {
                  if (!approvalId) return;
                  onApprovalResponse?.({
                    id: approvalId,
                    approved: false,
                    reason: "User denied tool execution",
                  });
                }}
              >
                Deny
              </ConfirmationAction>
              <ConfirmationAction
                disabled={!approvalId}
                onClick={() => {
                  if (!approvalId) return;
                  onApprovalResponse?.({
                    id: approvalId,
                    approved: true,
                    reason: "User approved tool execution",
                  });
                }}
              >
                Approve
              </ConfirmationAction>
            </ConfirmationActions>
          </ConfirmationRequest>
          <ConfirmationAccepted>
            <ConfirmationTitle>Approved. Running the action.</ConfirmationTitle>
          </ConfirmationAccepted>
          <ConfirmationRejected>
            <ConfirmationTitle>Denied. The action was not run.</ConfirmationTitle>
          </ConfirmationRejected>
        </Confirmation>
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
  liveStatus,
}: {
  hasToolCalls: boolean;
  councilMode?: boolean;
  liveStatus?: StrategistLiveStatus | null;
}) {
  const statusMessage = liveStatus?.message;
  const isWarning = liveStatus?.status === "warning";
  const isSuccess = liveStatus?.status === "success";

  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar councilMode={councilMode} />
      <Message from="assistant">
        <MessageContent>
          <div className="flex items-center gap-2.5 py-1 text-sm text-muted-foreground">
            {statusMessage ? (
              <>
                <DatabaseIcon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isWarning
                      ? "text-amber-600"
                      : isSuccess
                        ? "text-primary"
                        : "animate-pulse text-muted-foreground",
                  )}
                />
                <span>{statusMessage}</span>
              </>
            ) : hasToolCalls ? (
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
  liveStatus?: StrategistLiveStatus | null;
  isLoadingMessages: boolean;
  isStreaming: boolean;
  input: string;
  sessionId?: string;
  councilMode?: boolean;
  onCouncilModeChange?: (val: boolean) => void;
  selectedProjectId?: number | null;
  onProjectChange?: (id: number | null) => void;
  selectedModel?: AiAssistantModelId;
  onModelChange?: (model: AiAssistantModelId) => void;
  onInputChange: (value: string) => void;
  onSubmit: (message: string, files?: FileList) => void;
  onToolApprovalResponse?: ToolApprovalResponseHandler;
  onStop: () => void;
}

export function ChatArea({
  messages,
  toolTracesByMessageId = {},
  sourcesByMessageId = {},
  memoryUsageByMessageId = {},
  responseQualityByMessageId = {},
  liveStatus,
  isLoadingMessages,
  isStreaming,
  input,
  sessionId,
  councilMode: councilModeProp,
  onCouncilModeChange,
  selectedProjectId: selectedProjectIdProp,
  onProjectChange,
  selectedModel = DEFAULT_AI_ASSISTANT_MODEL,
  onModelChange,
  onInputChange,
  onSubmit,
  onToolApprovalResponse,
  onStop,
}: ChatAreaProps) {
  // Council mode can be controlled externally (via prop) or internally
  const [councilModeInternal, setCouncilModeInternal] = useState(false);

  // Project selector
  const [projectOpen, setProjectOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileList | undefined>();
  const [uploadedPreviews, setUploadedPreviews] = useState<
    Array<{ url?: string; name: string; type: string; isImage: boolean }>
  >([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isMicrophoneBlocked, setIsMicrophoneBlocked] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const baseTextRef = useRef("");
  const finalTranscriptsRef = useRef("");
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [loadingSpeechMessageId, setLoadingSpeechMessageId] = useState<string | null>(null);
  const { projects, isLoading: projectsLoading } = useProjects({ limit: 50 });
  const selectedProject = projects.find((p) => p.id === selectedProjectIdProp) ?? null;
  const selectedModelOption =
    AI_ASSISTANT_MODELS.find((model) => model.id === selectedModel) ??
    AI_ASSISTANT_MODELS[0];
  const councilMode = councilModeProp ?? councilModeInternal;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const speechWindow = window as unknown as WindowWithSpeechRecognition;
    const SpeechRecognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let newFinalText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          newFinalText += `${result[0].transcript} `;
        }
      }

      if (newFinalText) {
        finalTranscriptsRef.current += newFinalText;
        onInputChange(baseTextRef.current + finalTranscriptsRef.current);
      }
    };
    recognition.onerror = (event) => {
      // "aborted" fires when recognition.stop() is called deliberately — not a real error
      // Regression: GH#281 — this was shown as "Voice input failed: aborted" to users
      if (event.error === "aborted") return;

      setIsRecording(false);

      if (event.error === "not-allowed") {
        setIsMicrophoneBlocked(true);
        toast.error("Microphone access is blocked", {
          id: "ai-assistant-microphone-blocked",
          description:
            "Enable microphone access for this site in browser site settings, then try voice input again.",
        });
        return;
      }

      if (event.error === "audio-capture") {
        toast.error("No microphone found", {
          description:
            "Make sure a microphone is connected and enabled in your system settings.",
        });
        return;
      }

      toast.error(
        event.error
          ? `Voice input failed: ${event.error}`
          : "Voice input failed",
      );
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [onInputChange]);

  useEffect(() => {
    return () => {
      uploadedPreviews.forEach((preview) => {
        if (preview.url) URL.revokeObjectURL(preview.url);
      });
    };
  }, [uploadedPreviews]);

  useEffect(() => {
    return () => {
      mediaStream?.getTracks().forEach((track) => track.stop());
    };
  }, [mediaStream]);

  const stopSpeech = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setSpeakingMessageId(null);
    setLoadingSpeechMessageId(null);
  }, []);

  useEffect(() => stopSpeech, [stopSpeech]);

  const handleCouncilToggle = useCallback(() => {
    const next = !councilMode;
    setCouncilModeInternal(next);
    onCouncilModeChange?.(next);
  }, [councilMode, onCouncilModeChange]);
  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && !uploadedFiles?.length) || isStreaming) return;
    try {
      const prepared = await prepareMessageWithReadableAttachments(
        trimmed || "Review these attachments",
        uploadedFiles,
      );
      onSubmit(prepared.message, prepared.files);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Attachment read failed: ${error.message}`
          : "Attachment read failed.",
      );
      return;
    }
    onInputChange("");
    setUploadedFiles(undefined);
    setUploadedPreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [input, isStreaming, onInputChange, onSubmit, uploadedFiles]);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files?.length) return;

      const transfer = new DataTransfer();
      Array.from(files).forEach((file) => transfer.items.add(file));
      setUploadedFiles(transfer.files);
      setUploadedPreviews(
        Array.from(files).map((file) => ({
          url: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
          name: file.name,
          type: file.type || "Unknown file type",
          isImage: file.type.startsWith("image/"),
        })),
      );
    },
    [],
  );

  const clearUploads = useCallback(() => {
    setUploadedFiles(undefined);
    setUploadedPreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      mediaStream?.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Voice input is not available because this browser does not expose microphone permissions to the app.");
      return;
    }

    baseTextRef.current = input;
    finalTranscriptsRef.current = "";
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        setIsMicrophoneBlocked(false);
        setMediaStream(stream);
        try {
          recognitionRef.current?.start();
          setIsRecording(true);
        } catch (error) {
          stream.getTracks().forEach((track) => track.stop());
          setMediaStream(null);
          toast.error(
            error instanceof Error
              ? `Voice input failed: ${error.message}`
              : "Voice input failed.",
          );
        }
      })
      .catch((error: unknown) => {
        setIsRecording(false);
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          setIsMicrophoneBlocked(true);
          toast.error("Microphone access is blocked", {
            id: "ai-assistant-microphone-blocked",
            description:
              "Enable microphone access for this site in browser site settings, then try voice input again.",
          });
          return;
        }

        setIsMicrophoneBlocked(false);
        toast.error(
          error instanceof Error
            ? `Microphone access failed: ${error.message}`
            : "Microphone access failed.",
        );
      });
  }, [input, isRecording, mediaStream]);

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  }, []);

  const handleSpeakResponse = useCallback(
    async (messageId: string, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      if (speakingMessageId === messageId) {
        stopSpeech();
        return;
      }

      stopSpeech();
      setLoadingSpeechMessageId(messageId);

      try {
        const audioBlob = await apiFetchBlob("/api/ai-assistant/speech", {
          method: "POST",
          body: JSON.stringify({ text: trimmed }),
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audioUrlRef.current = audioUrl;
        audio.onended = stopSpeech;
        audio.onerror = () => {
          stopSpeech();
          toast.error("AI voice playback failed.");
        };
        await audio.play();
        setSpeakingMessageId(messageId);
      } catch (error) {
        stopSpeech();
        toast.error(
          error instanceof Error
            ? error.message
            : "AI voice playback failed.",
        );
      } finally {
        setLoadingSpeechMessageId(null);
      }
    },
    [speakingMessageId, stopSpeech],
  );

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
  const lastMessageStatus = lastMessage ? getLatestStatusPart(lastMessage) : null;
  const lastIsAssistantWithToolCalls =
    lastMessage?.role === "assistant" && hasToolInvocations(lastMessage);
  const showStreamingIndicator =
    isStreaming &&
    messages.length > 0 &&
    (lastMessage?.role === "user" ||
      Boolean(lastMessageStatus) ||
      (lastIsAssistantWithToolCalls && !lastMessageText.trim()));

  // Generate contextual follow-up suggestions
  const suggestions = useMemo(
    () => generateSuggestions(messages, isStreaming),
    [messages, isStreaming],
  );
  const composerIconButtonClass =
    "h-10 w-10 rounded-full bg-muted/60 text-foreground shadow-none hover:bg-muted hover:text-foreground sm:h-11 sm:w-11";

  // Shared prompt input element
  const promptInputEl = (
    <PromptInput
      value={input}
      onValueChange={onInputChange}
      isLoading={isStreaming}
      onSubmit={handleSubmit}
      className={cn(
        "overflow-hidden rounded-[1.75rem] border-0 bg-background px-4 py-4 shadow-md ring-1 ring-border/70 transition-all focus-within:ring-2 focus-within:ring-primary/15 sm:rounded-[2rem] sm:px-5",
        hasMessages && "rounded-[2rem]",
      )}
    >
      <Input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileSelect}
      />
      {uploadedPreviews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-1 pb-2">
          {uploadedPreviews.map((preview) => (
            <div
              key={`${preview.name}-${preview.type}`}
              className="image-bounce relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted"
            >
              {preview.isImage && preview.url ? (
                <Image
                  src={preview.url}
                  alt={preview.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <FileTextIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              )}
              <span className="sr-only">{preview.name}</span>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="mt-1 rounded-full"
            onClick={clearUploads}
            aria-label="Remove attachments"
          >
            <XIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <PromptInputTextarea
        placeholder={
          isRecording
            ? "Listening..."
            : councilMode
            ? "Ask the council for a recommendation..."
            : "Type a message... (Shift+Enter for new line)"
        }
        className="min-h-12 px-2 pb-3 pt-1 text-base leading-6 placeholder:text-muted-foreground/70 sm:text-lg"
      />
      <PromptInputActions className="flex items-center justify-between gap-2 px-0 pb-0">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <PromptInputAction tooltip="Attach files">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={composerIconButtonClass}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach files"
            >
              <PaperclipIcon className="h-4 w-4" />
            </Button>
          </PromptInputAction>
          <PromptInputAction tooltip={isRecording ? "Stop voice input" : "Voice input"}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn(
                composerIconButtonClass,
                isRecording && "bg-primary/10 text-primary",
              )}
              onClick={toggleRecording}
              aria-label={isRecording ? "Stop voice input" : "Start voice input"}
            >
              {isRecording ? (
                <MicOffIcon className="h-4 w-4" />
              ) : (
                <MicIcon className="h-4 w-4" />
              )}
            </Button>
          </PromptInputAction>
          {isRecording && (
            <div className="w-24 shrink-0">
              <AudioWaveform isRecording={isRecording} stream={mediaStream} />
            </div>
          )}
          {isMicrophoneBlocked && !isRecording && (
            <div className="flex min-w-44 items-center gap-1.5 whitespace-nowrap px-1 text-xs text-muted-foreground">
              <MicOffIcon className="h-3.5 w-3.5 shrink-0 text-destructive" />
              <span>Enable mic access in site settings.</span>
            </div>
          )}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className={cn(
                        composerIconButtonClass,
                        selectedProject && "bg-primary/10 text-primary hover:bg-primary/15",
                      )}
                      aria-label="Select project context"
                    >
                      <FolderIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <PopoverContent className="w-64 p-0" align="start" side="top">
                  <Command>
                    <CommandInput placeholder="Search projects…" className="h-9" />
                    <CommandList>
                      <CommandEmpty>
                        {projectsLoading ? "Loading…" : "No projects found"}
                      </CommandEmpty>
                      <CommandGroup>
                        {selectedProject && (
                          <CommandItem
                            value="clear selected project"
                            onSelect={() => {
                              onProjectChange?.(null);
                              setProjectOpen(false);
                            }}
                          >
                            <span className="flex-1 truncate text-muted-foreground">
                              Clear project selection
                            </span>
                            <XIcon className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </CommandItem>
                        )}
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
              <TooltipContent side="top">
                {selectedProject
                  ? `Project context: ${selectedProject.name ?? "Selected project"}`
                  : "Select a project"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <PromptInputAction tooltip={councilMode ? "Council mode on" : "Council mode"}>
            <Button
              type="button"
              variant="ghost"
              role="switch"
              aria-checked={councilMode}
              size="icon-sm"
              onClick={handleCouncilToggle}
              className={cn(
                composerIconButtonClass,
                councilMode && "bg-primary/10 text-primary hover:bg-primary/15",
              )}
              aria-label={councilMode ? "Turn off council mode" : "Turn on council mode"}
            >
              <UsersRoundIcon className="h-4 w-4" />
            </Button>
          </PromptInputAction>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <Popover open={modelOpen} onOpenChange={setModelOpen}>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className={composerIconButtonClass}
                      aria-label="Select AI model"
                    >
                      <BrainIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <PopoverContent className="w-64 p-0" align="start" side="top">
                  <Command>
                    <CommandInput placeholder="Search models..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No models found</CommandEmpty>
                      <CommandGroup>
                        {AI_ASSISTANT_MODELS.map((model) => (
                          <CommandItem
                            key={model.id}
                            value={`${model.label} ${model.description} ${model.id}`}
                            onSelect={() => {
                              onModelChange?.(model.id);
                              setModelOpen(false);
                            }}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate">{model.label}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {model.description}
                              </span>
                            </span>
                            {model.id === selectedModel && (
                              <CheckIcon className="ml-2 h-3.5 w-3.5 shrink-0 text-primary" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <TooltipContent side="top">
                Model: {selectedModelOption.label}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <PromptInputAction tooltip={isStreaming ? "Stop" : "Send"}>
            <Button
              size="icon"
              variant={input.trim() ? "default" : "ghost"}
              className={cn(
                "relative h-10 w-10 rounded-full sm:h-11 sm:w-11",
                isStreaming && "bg-transparent hover:bg-transparent",
              )}
              disabled={!input.trim() && !uploadedFiles?.length && !isStreaming}
              onClick={isStreaming ? onStop : handleSubmit}
            >
              {isStreaming ? (
                <>
                  <AnimatedOrb size={36} variant="red" />
                  <SquareIcon className="absolute h-3.5 w-3.5 text-red-700" fill="currentColor" />
                </>
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
                const imageParts = isAssistant ? [] : getImageParts(msg);
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
                              <>
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
                              {toolParts.some((part) => part.approval) && (
                                <div className="mt-2 space-y-2">
                                  {toolParts
                                    .filter((part) => part.approval)
                                    .map((part) => (
                                      <ToolCallItem
                                        key={part.toolCallId}
                                        part={part}
                                        onApprove={handleToolApprove}
                                        onEdit={handleToolEdit}
                                        onRun={handleToolRun}
                                        onApprovalResponse={onToolApprovalResponse}
                                      />
                                    ))}
                                </div>
                              )}
                              </>
                            ) : (
                              <ToolCallItem
                                part={toolParts[0]}
                                onApprove={handleToolApprove}
                                onEdit={handleToolEdit}
                                onRun={handleToolRun}
                                onApprovalResponse={onToolApprovalResponse}
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
                      <MessageContent className="user-message-enter rounded-[1.4rem] border border-border/60 bg-background px-4 py-3 shadow-sm sm:px-5">
                        {imageParts.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {imageParts.map((image) => (
                              <div
                                key={image.url}
                                className="relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted"
                              >
                                <Image
                                  src={image.url}
                                  alt={image.filename ?? "Uploaded image"}
                                  fill
                                  className="object-cover"
                                  sizes="80px"
                                />
                              </div>
                            ))}
                          </div>
                        )}
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
                              {toolParts.some((part) => part.approval) && (
                                <div className="mt-2 space-y-2">
                                  {toolParts
                                    .filter((part) => part.approval)
                                    .map((part) => (
                                      <ToolCallItem
                                        key={part.toolCallId}
                                        part={part}
                                        onApprove={handleToolApprove}
                                        onEdit={handleToolEdit}
                                        onRun={handleToolRun}
                                        onApprovalResponse={onToolApprovalResponse}
                                      />
                                    ))}
                                </div>
                              )}
                            </div>
                          ) : toolParts.length === 1 ? (
                            <div className="mb-3">
                              <ToolCallItem
                                part={toolParts[0]}
                                onApprove={handleToolApprove}
                                onEdit={handleToolEdit}
                                onRun={handleToolRun}
                                onApprovalResponse={onToolApprovalResponse}
                              />
                            </div>
                          ) : null}

                          {/* Main text response */}
                          <MessageResponse className="text-sm leading-6">
                            {formattedAssistantText}
                          </MessageResponse>

                          {responseQuality && (
                            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>
                                Confidence: <span className="font-medium">{responseQuality.confidence}</span>
                              </span>
                              <span>/</span>
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
                              tooltip={
                                speakingMessageId === msg.id
                                  ? "Stop voice"
                                  : "Read aloud"
                              }
                              onClick={() => handleSpeakResponse(msg.id, formattedAssistantText)}
                              disabled={
                                isStreaming ||
                                (loadingSpeechMessageId !== null &&
                                  loadingSpeechMessageId !== msg.id)
                              }
                            >
                              {speakingMessageId === msg.id ? (
                                <VolumeXIcon className="h-3.5 w-3.5" />
                              ) : (
                                <Volume2Icon
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    loadingSpeechMessageId === msg.id && "animate-pulse",
                                  )}
                                />
                              )}
                            </MessageAction>
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
                  liveStatus={liveStatus ?? lastMessageStatus}
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
