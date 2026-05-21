"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
  ExternalLink,
  GitBranch,
  Github,
  GripVertical,
  Hash,
  Image as ImageIcon,
  Link2,
  List,
  Loader2,
  PanelRightOpen,
  PauseCircle,
  Play,
  ShieldCheck,
  Trash2,
  Wrench,
  XCircle,
} from "lucide-react";
import { appToast as toast } from "@/lib/toast/app-toast";

import { EmptyState, ErrorState } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { displayAdminFeedbackTitle } from "@/lib/admin-feedback/title";
import { getErrorDetail } from "@/lib/format-error";
import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";
import { useConfirm } from "@/hooks/use-confirm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedbackItem = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  project_id: number | null;
  page_url: string;
  page_path: string;
  page_title: string | null;
  target_id: string | null;
  target_selector: string;
  target_text: string | null;
  target_tag: string | null;
  dom_path: string | null;
  target_rect: { x: number; y: number; width: number; height: number } | null;
  title: string;
  comment: string;
  request_type: string;
  severity: string | null;
  status: string;
  screenshot_url: string | null;
  screenshot_path: string | null;
  github_issue_number: number | null;
  github_issue_url: string | null;
  github_issue_state: string | null;
  metadata: Record<string, unknown>;
  submitter: UserProfile;
};

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
};

type FeedbackComment = {
  id: string;
  feedback_item_id: string;
  author_id: string;
  body: string;
  mentions: string[] | null;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
  author: UserProfile;
};

function notifyFeedbackInboxFailure({
  operation,
  title,
  fallback,
  error,
  metadata,
}: {
  operation: string;
  title: string;
  fallback: string;
  error: unknown;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}) {
  const description = getErrorDetail(error);
  reportNonCriticalFailure({
    area: "feedback-inbox",
    operation,
    error,
    userVisibleFallback: fallback,
    metadata,
  });
  toast.error(title, { description });
}

type GitHubComment = {
  id: number;
  body: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
    type: string; // "User" | "Bot"
  };
  author_association: string;
};

type StatusFilter = "open" | "in_progress" | "deferred" | "resolved" | "all";
type DisplayStatus = Exclude<StatusFilter, "all"> | "archived";
type InboxViewMode = "triage" | "split";
type AgentTarget = "codex" | "claude_code";

type DispatchHistoryEntry = {
  target: AgentTarget;
  at: string;
  by: string;
  status: string;
  annotationId: string | null;
  trigger?: "github" | "metadata_queue";
  githubIssueUrl?: string | null;
};
type FeedbackInboxTab = "issues" | "feature_requests";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Submitted" },
  { value: "in_progress", label: "In Progress" },
  { value: "deferred", label: "Deferred" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

const STATUS_OPTIONS: { value: DisplayStatus; label: string }[] = [
  { value: "open", label: "Submitted" },
  { value: "in_progress", label: "In Progress" },
  { value: "deferred", label: "Deferred" },
  { value: "resolved", label: "Resolved" },
  { value: "archived", label: "Archived" },
];

const FEEDBACK_INBOX_TABS: { value: FeedbackInboxTab; label: string }[] = [
  { value: "issues", label: "Issues" },
  { value: "feature_requests", label: "Feature Requests" },
];

const STATUS_META: Record<DisplayStatus, { icon: typeof Circle; className: string; dotClassName: string; label: string; showInList?: boolean }> = {
  open: {
    icon: Circle,
    className: "text-status-warning",
    dotClassName: "bg-status-warning",
    label: "Submitted",
  },
  in_progress: {
    icon: Loader2,
    className: "text-status-info",
    dotClassName: "bg-status-info animate-pulse",
    label: "In Progress",
    showInList: true,
  },
  deferred: {
    icon: PauseCircle,
    className: "text-muted-foreground",
    dotClassName: "bg-muted-foreground",
    label: "Deferred",
    showInList: true,
  },
  resolved: {
    icon: ShieldCheck,
    className: "text-status-success",
    dotClassName: "bg-status-success",
    label: "Resolved",
    showInList: true,
  },
  archived: {
    icon: Archive,
    className: "text-muted-foreground",
    dotClassName: "bg-muted-foreground",
    label: "Archived",
    showInList: true,
  },
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  change_request: "Change Events",
  copy: "Copy",
  feature_request: "Feature Request",
  question: "Question",
};


const PANEL_MIN_WIDTH = 280;
const PANEL_MAX_WIDTH = 600;
const PANEL_DEFAULT_WIDTH = 480;
const PANEL_STORAGE_KEY = "feedback-inbox-panel-width";
const VIEW_MODE_STORAGE_KEY = "feedback-inbox-view-mode";
const IN_PROGRESS_STATUSES = new Set([
  "in_progress",
  "triaged",
  "diagnosing",
  "fixing",
  "verifying",
  "in_review",
]);
const RESOLVED_STATUSES = new Set(["resolved", "closed"]);
const DEFERRED_STATUSES = new Set(["deferred"]);
const ARCHIVED_STATUSES = new Set(["archived"]);
const LIST_SECTION_ORDER: DisplayStatus[] = ["in_progress", "open", "deferred", "resolved"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toolLabelFromPath(pagePath: string): string | null {
  const parts = pagePath.split("/").filter(Boolean);
  // Look for /projects/<id>/<tool> pattern
  const projectsIdx = parts.indexOf("projects");
  if (projectsIdx >= 0 && parts.length > projectsIdx + 2) {
    const toolSlug = parts[projectsIdx + 2];
    if (!/^\d+$/.test(toolSlug)) {
      return toolSlug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }
  // Fallback: last non-numeric segment
  const nonNumeric = parts.filter((p) => !/^\d+$/.test(p));
  if (nonNumeric.length > 0) {
    const last = nonNumeric[nonNumeric.length - 1];
    return last
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return null;
}

function relativeTime(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function toDisplayStatus(status: string): DisplayStatus {
  if (ARCHIVED_STATUSES.has(status)) return "archived";
  if (RESOLVED_STATUSES.has(status)) return "resolved";
  if (DEFERRED_STATUSES.has(status)) return "deferred";
  if (IN_PROGRESS_STATUSES.has(status)) return "in_progress";
  return "open";
}

function getInitials(profile: UserProfile): string {
  if (profile.full_name) {
    return profile.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return profile.email[0].toUpperCase();
}

function displayName(profile: UserProfile): string {
  return profile.full_name || profile.email.split("@")[0];
}

function submitterLabel(item: FeedbackItem): string {
  return item.submitter ? displayName(item.submitter) : item.created_by;
}

function getMetadata(item: FeedbackItem) {
  if (item.metadata && typeof item.metadata === "object") {
    return item.metadata;
  }
  return {};
}

function getAssignedAgent(item: FeedbackItem): AgentTarget | null {
  const value = getMetadata(item).assignedAgent;
  if (value === "codex" || value === "claude_code") return value;
  return null;
}

function getDispatchStatus(item: FeedbackItem) {
  const value = getMetadata(item).dispatchStatus;
  return typeof value === "string" ? value : null;
}

function getDispatchTrigger(item: FeedbackItem) {
  const value = getMetadata(item).dispatchTrigger;
  if (value === "github") return "GitHub";
  if (value === "metadata_queue") return "Queue";
  return null;
}

function getDispatchHistory(item: FeedbackItem): DispatchHistoryEntry[] {
  const value = getMetadata(item).dispatchHistory;
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => typeof entry === "object" && entry !== null)
    .map((entry) => {
      const record = entry as Record<string, unknown>;
      return {
        target: (record.target === "claude_code" ? "claude_code" : "codex") as AgentTarget,
        at: typeof record.at === "string" ? record.at : "",
        by: typeof record.by === "string" ? record.by : "",
        status: typeof record.status === "string" ? record.status : "",
        annotationId: typeof record.annotationId === "string" ? record.annotationId : null,
        trigger: (record.trigger === "github" ? "github" : "metadata_queue") as "github" | "metadata_queue",
        githubIssueUrl:
          typeof record.githubIssueUrl === "string" ? record.githubIssueUrl : null,
      } satisfies DispatchHistoryEntry;
    })
    .filter((entry) => entry.at.length > 0);
}

function agentLabel(target: AgentTarget) {
  return target === "codex" ? "Codex" : "Claude Code";
}

function getSavedViewMode(): InboxViewMode {
  if (typeof window === "undefined") return "triage";
  try {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return saved === "split" ? "split" : "triage";
  } catch (error) {
    reportNonCriticalFailure({
      area: "feedback-inbox",
      operation: "load-view-mode",
      error,
      userVisibleFallback: "Feedback inbox view reset to triage.",
    });
    return "triage";
  }
}

function CollapsibleDetailSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="pt-2"
    >
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 text-left outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <SectionRuleHeading label={label} className="mb-0 pb-0" />
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Extract @mentioned user IDs from text like "@userId" */
function extractMentionIds(text: string, users: UserProfile[]): string[] {
  const ids: string[] = [];
  for (const user of users) {
    const name = displayName(user).toLowerCase();
    const pattern = new RegExp(`@${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(text)) {
      ids.push(user.id);
    }
  }
  return ids;
}

function getSavedPanelWidth(): number {
  if (typeof window === "undefined") return PANEL_DEFAULT_WIDTH;
  try {
    const saved = localStorage.getItem(PANEL_STORAGE_KEY);
    if (saved) {
      const w = parseInt(saved, 10);
      if (w >= PANEL_MIN_WIDTH && w <= PANEL_MAX_WIDTH) return w;
    }
  } catch (error) {
    reportNonCriticalFailure({
      area: "feedback-inbox",
      operation: "load-saved-panel-width",
      error,
      userVisibleFallback: "Feedback inbox panel width reset to the default.",
    });
  }
  return PANEL_DEFAULT_WIDTH;
}

/** Render simple markdown: bold, italic, inline code, links, line breaks */
function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/g);
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith("_") && part.endsWith("_")) {
      nodes.push(<em key={`${keyPrefix}-${i}`}>{part.slice(1, -1)}</em>);
    } else if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(
        <code key={`${keyPrefix}-${i}`} className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
          {part.slice(1, -1)}
        </code>,
      );
    } else if (part.startsWith("[")) {
      const linkText = parts[i + 1];
      const linkUrl = parts[i + 2];
      if (linkText && linkUrl) {
        nodes.push(
          <a key={`${keyPrefix}-${i}`} href={linkUrl} target="_blank" rel="noopener noreferrer"
            className="text-primary underline hover:opacity-80 break-all">
            {linkText}
          </a>,
        );
        i += 2;
      }
    } else {
      nodes.push(part);
    }
  }
  return nodes;
}

function renderSimpleMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={`code-${i}`} className="my-1.5 overflow-x-auto rounded bg-muted px-3 py-2 text-xs font-mono leading-relaxed whitespace-pre-wrap">
          {codeLines.join("\n")}
        </pre>,
      );
      i++;
      continue;
    }

    // Headings
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    if (h1) {
      nodes.push(<h1 key={`h1-${i}`} className="mt-2 mb-1 text-base font-semibold text-foreground">{h1[1]}</h1>);
      i++; continue;
    }
    if (h2) {
      nodes.push(<h2 key={`h2-${i}`} className="mt-2 mb-1 text-sm font-semibold text-foreground">{h2[1]}</h2>);
      i++; continue;
    }
    if (h3) {
      nodes.push(<h3 key={`h3-${i}`} className="mt-1.5 mb-0.5 text-xs font-semibold text-foreground">{h3[1]}</h3>);
      i++; continue;
    }

    // Bullet list
    if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].replace(/^[-*] /, ""));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="my-1 ml-4 list-disc space-y-0.5">
          {items.map((item, idx) => (
            <li key={`${i}-${idx}-${item.slice(0, 20)}`} className="text-sm">{renderInlineMarkdown(item, `ul-${i}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Blank line → spacer
    if (line.trim() === "") {
      nodes.push(<div key={`gap-${i}`} className="h-1.5" />);
      i++; continue;
    }

    // Normal paragraph line
    nodes.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed">
        {renderInlineMarkdown(line, `p-${i}`)}
      </p>,
    );
    i++;
  }

  return <>{nodes}</>;
}

// ---------------------------------------------------------------------------
// Comment Input with @mention autocomplete
// ---------------------------------------------------------------------------

function CommentInput({
  onSubmit,
  users,
  submitting,
  inputRef: externalInputRef,
}: {
  onSubmit: (body: string, mentions: string[], screenshotDataUrl: string | null) => void;
  users: UserProfile[];
  submitting: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [value, setValue] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const localInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? localInputRef;

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setScreenshotDataUrl(reader.result);
      }
    };
    reader.onerror = () => {
      const error = reader.error ?? new Error("The browser could not read the selected image file.");
      notifyFeedbackInboxFailure({
        operation: "read-comment-screenshot",
        title: "Could not read image file",
        fallback: "The selected feedback comment screenshot could not be read.",
        error,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
        },
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const filteredUsers = useMemo(() => {
    if (!mentionQuery) return users;
    const q = mentionQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.full_name?.toLowerCase().includes(q)) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, mentionQuery]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setValue(text);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  }

  function insertMention(user: UserProfile) {
    const textarea = inputRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    const textAfterCursor = value.slice(cursorPos);
    const mentionText = `@${displayName(user)} `;

    const newValue = value.slice(0, atIndex) + mentionText + textAfterCursor;
    setValue(newValue);
    setShowMentions(false);
    setMentionQuery("");

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = atIndex + mentionText.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, filteredUsers.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredUsers[mentionIndex]);
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
      return;
    }

    // Submit on Cmd/Ctrl+Enter
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if ((!trimmed && !screenshotDataUrl) || submitting) return;
    const mentions = extractMentionIds(trimmed, users);
    onSubmit(trimmed || "(screenshot)", mentions, screenshotDataUrl);
    setValue("");
    setScreenshotDataUrl(null);
    setShowMentions(false);
  }

  return (
    <div className="relative">
      {/* Mention dropdown */}
      {showMentions && filteredUsers.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-sm z-10">
          {filteredUsers.map((user, i) => (
            <Button
              key={user.id}
              type="button"
              variant="ghost"
              size="default"
              className={cn(
                "h-auto w-full justify-start gap-1.5 rounded-none px-2 py-1 text-left text-xs font-normal",
                i === mentionIndex ? "bg-muted" : "hover:bg-muted/50",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(user);
              }}
              onMouseEnter={() => setMentionIndex(i)}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-medium text-primary">
                {getInitials(user)}
              </span>
              <span className="truncate text-xs font-medium text-foreground">
                {displayName(user)}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {user.email}
              </span>
            </Button>
          ))}
        </div>
      )}

      {/* Screenshot preview */}
      {screenshotDataUrl && (
        <div className="mb-2 relative inline-block">
          <img
            src={screenshotDataUrl}
            alt="Comment screenshot"
            className="h-24 max-w-48 rounded-lg border border-border object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon-xs"
            onClick={() => setScreenshotDataUrl(null)}
            className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full shadow-sm transition-colors hover:bg-destructive/90"
            aria-label="Remove screenshot"
          >
            <XCircle className="h-3 w-3" />
          </Button>
        </div>
      )}

      { }
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-label="Attach image"
        className="hidden"
        onChange={handleFileUpload}
      />
      <div className="rounded-lg border border-border bg-background focus-within:ring-1 focus-within:ring-ring">
        {/* eslint-disable-next-line design-system/no-raw-form-controls -- custom mention-aware textarea with imperative ref; DS Textarea does not support mention overlay */}
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment... Use @ to mention someone"
          rows={3}
          className="w-full resize-none border-0 bg-transparent px-3 pt-3 pb-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 items-center gap-1.5 px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Attach image
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              <kbd className="rounded border border-border px-1 py-0.5 text-xs">&#8984;Enter</kbd>
            </span>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={(!value.trim() && !screenshotDataUrl) || submitting}
              className="h-7 px-3 text-xs"
            >
              {submitting ? "Sending..." : "Submit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comments Section
// ---------------------------------------------------------------------------

function CommentsSection({
  feedbackItemId,
  commentInputRef,
}: {
  feedbackItemId: string;
  commentInputRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const data = await apiFetch<{ comments?: FeedbackComment[] }>(
        `/api/admin/feedback/comments?feedbackItemId=${feedbackItemId}`,
      );
      setComments(data.comments ?? []);
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "load-comments",
        title: "Could not load comments",
        fallback: "Feedback comments could not be loaded.",
        error: err,
        metadata: { feedbackItemId },
      });
    } finally {
      setLoading(false);
    }
  }, [feedbackItemId]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiFetch<
        UserProfile[] | { users?: UserProfile[]; data?: UserProfile[] }
      >("/api/users");
      const userList = Array.isArray(data)
        ? data
        : data.users ?? data.data ?? [];
      setUsers(userList);
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "load-comment-users",
        title: "Could not load mention users",
        fallback: "Mention user options could not be loaded.",
        error: err,
        metadata: { feedbackItemId },
      });
    }
  }, [feedbackItemId]);

  useEffect(() => {
    setLoading(true);
    setComments([]);
    fetchComments();
    fetchUsers();
  }, [fetchComments, fetchUsers]);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }

  async function handleSubmit(body: string, mentions: string[], screenshotDataUrl: string | null) {
    setSubmitting(true);
    try {
      const data = await apiFetch<{ comment: FeedbackComment }>(
        "/api/admin/feedback/comments",
        {
          method: "POST",
          body: JSON.stringify({
            feedbackItemId,
            body,
            mentions,
            screenshotDataUrl,
          }),
        },
      );
      setComments((prev) => [...prev, data.comment]);
      scrollToBottom();
      if (mentions.length > 0) {
        toast.success(`Comment added and ${mentions.length} user${mentions.length > 1 ? "s" : ""} notified`);
      }
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "add-comment",
        title: "Could not add comment",
        fallback: "The feedback comment could not be saved.",
        error: err,
        metadata: {
          feedbackItemId,
          mentionCount: mentions.length,
          hasScreenshot: Boolean(screenshotDataUrl),
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  /** Render comment body with @mentions highlighted */
  function renderBody(body: string) {
    const parts = body.split(/(@\w+(?:\s\w+)?)/g);
    return parts.map((part) => {
      if (part.startsWith("@")) {
        return (
          <span key={part} className="font-medium text-primary">
            {part}
          </span>
        );
      }
      return part;
    });
  }

  return (
    <div>
      <SectionRuleHeading label="Comments" />

      {/* Comment list */}
      <div ref={scrollRef} className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary mt-0.5">
              {getInitials(comment.author)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-foreground">
                  {displayName(comment.author)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {relativeTime(comment.created_at)}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {renderBody(comment.body)}
              </p>
              {comment.screenshot_url && (
                <a
                  href={comment.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block"
                >
                  <img
                    src={comment.screenshot_url}
                    alt="Comment screenshot"
                    className="max-h-40 max-w-full rounded-lg border border-border object-cover hover:opacity-90 transition-opacity"
                  />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comment input */}
      <CommentInput
        onSubmit={handleSubmit}
        users={users}
        submitting={submitting}
        inputRef={commentInputRef}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent Dispatch
// ---------------------------------------------------------------------------

function AgentDispatchSection({
  item,
  dispatching,
  onDispatch,
}: {
  item: FeedbackItem;
  dispatching: boolean;
  onDispatch: (id: string, target: AgentTarget) => void;
}) {
  const dispatchStatus = getDispatchStatus(item);
  const dispatchTrigger = getDispatchTrigger(item);
  const history = getDispatchHistory(item);
  const lastDispatch = history[0] ?? null;
  const [target, setTarget] = useState<AgentTarget>(() => getAssignedAgent(item) ?? "codex");

  useEffect(() => {
    setTarget(getAssignedAgent(item) ?? "codex");
  }, [item.id, item.metadata]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Select value={target} onValueChange={(value) => setTarget(value as AgentTarget)}>
          <SelectTrigger
            aria-label="Agent target"
            size="sm"
            className="h-7 w-32 px-2 text-xs font-medium"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="codex">Codex</SelectItem>
            <SelectItem value="claude_code">Claude Code</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="link"
          size="xs"
          onClick={() => onDispatch(item.id, target)}
          disabled={dispatching}
          className="h-auto p-0 text-xs font-medium"
        >
          {dispatching ? "Dispatching..." : "Dispatch"}
        </Button>
      </div>

      {(dispatchStatus || lastDispatch) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {dispatchStatus && (
            <span>
              Dispatch: <span className="font-medium text-foreground">{dispatchStatus}</span>
            </span>
          )}
          {dispatchTrigger && (
            <>
              <span className="text-border">/</span>
              <span>{dispatchTrigger}</span>
            </>
          )}
          {lastDispatch && (
            <>
              <span className="text-border">/</span>
              <span>
                Last sent to {agentLabel(lastDispatch.target)} {relativeTime(lastDispatch.at)}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GitHub Activity Section
// ---------------------------------------------------------------------------

function GitHubActivitySection({ issueNumber }: { issueNumber: number }) {
  const [comments, setComments] = useState<GitHubComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const data = await apiFetch<{ comments?: GitHubComment[] }>(
        `/api/admin/feedback/github-comments?issueNumber=${issueNumber}`,
      );
      setComments(data.comments ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [issueNumber]);

  useEffect(() => {
    setLoading(true);
    setComments([]);
    setError(null);
    fetchComments();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchComments, 30_000);
    return () => clearInterval(interval);
  }, [fetchComments]);

  const isBotComment = (comment: GitHubComment) =>
    comment.user.type === "Bot" ||
    comment.user.login.endsWith("[bot]") ||
    comment.user.login === "github-actions";

  return (
    <div>
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}

      {error && <ErrorState error={error} />}

      {!loading && !error && comments.length === 0 && (
        <EmptyState
          icon={<Github />}
          title="No GitHub comments yet"
          description="Comments will appear here once the issue has activity."
        />
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2">
            <img
              src={comment.user.avatar_url}
              alt={comment.user.login}
              className="h-7 w-7 shrink-0 rounded-full mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">
                  {comment.user.login}
                </span>
                {isBotComment(comment) && (
                  <Badge variant="outline" className="h-4 px-1.5 py-0 text-xs font-medium text-status-info border-status-info/30 dark:border-status-info/50">
                    Claude Code
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {relativeTime(comment.created_at)}
                </span>
              </div>
              <div className="mt-0.5 text-foreground">
                {renderSimpleMarkdown(comment.body)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Context Menu for List Items
// ---------------------------------------------------------------------------

function ListItemContextMenu({
  item,
  children,
  onUpdateStatus,
  onSendToGitHub,
  onDelete,
}: {
  item: FeedbackItem;
  children: React.ReactNode;
  onUpdateStatus: (id: string, status: DisplayStatus) => void;
  onSendToGitHub: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirm: confirmDelete, ConfirmDialog: ListItemConfirmDialog } = useConfirm();

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextPos({ x: e.clientX, y: e.clientY });
  }

  useEffect(() => {
    if (!contextPos) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextPos(null);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setContextPos(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextPos]);

  const displayStatus = toDisplayStatus(item.status);
  const isResolved = displayStatus === "resolved";

  async function handleAction(action: string) {
    setContextPos(null);
    switch (action) {
      case "resolve":
        onUpdateStatus(item.id, "resolved");
        break;
      case "reopen":
        onUpdateStatus(item.id, "open");
        break;
      case "send_to_github":
        onSendToGitHub(item.id);
        break;
      case "view_github":
        if (item.github_issue_url) {
          window.open(item.github_issue_url, "_blank", "noopener,noreferrer");
        }
        break;
      case "copy_link":
        navigator.clipboard.writeText(`${window.location.origin}/feedback-inbox?id=${item.id}`);
        toast.success("Link copied to clipboard");
        break;
      case "copy_id":
        navigator.clipboard.writeText(item.id);
        toast.success("ID copied to clipboard");
        break;
      case "archive":
        onUpdateStatus(item.id, "archived");
        break;
      case "defer":
        onUpdateStatus(item.id, "deferred");
        break;
      case "delete": {
        const ok = await confirmDelete({
          description: "Delete this feedback item? This cannot be undone.",
          variant: "destructive",
          confirmLabel: "Delete",
        });
        if (ok) onDelete(item.id);
        break;
      }
    }
  }

  return (
    <>
      <div onContextMenu={handleContextMenu} className="contents">
        {children}
      </div>

      {contextPos && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-40 rounded-md border border-border bg-popover p-1 shadow-sm animate-in fade-in-0 zoom-in-95"
          style={{ top: contextPos.y, left: contextPos.x }}
        >
          {!isResolved && (
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              onClick={() => handleAction("resolve")}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Resolve
            </Button>
          )}

          {isResolved && (
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              onClick={() => handleAction("reopen")}
            >
              <Circle className="h-3.5 w-3.5" />
              Move to Submitted
            </Button>
          )}

          <div className="my-1 h-px bg-border" />

          {!item.github_issue_number && (
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              onClick={() => handleAction("send_to_github")}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Create Issue
            </Button>
          )}

          {item.github_issue_url && (
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              onClick={() => handleAction("view_github")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View in GitHub
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="default"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
            onClick={() => handleAction("copy_link")}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy link
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="default"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
            onClick={() => handleAction("copy_id")}
          >
            <Hash className="h-3.5 w-3.5" />
            Copy ID
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="default"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
            onClick={() => handleAction("defer")}
          >
            <PauseCircle className="h-3.5 w-3.5" />
            Defer
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="default"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
            onClick={() => handleAction("archive")}
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </Button>

          <div className="my-1 h-px bg-border" />

          <Button
            type="button"
            variant="ghost"
            size="default"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-status-error hover:bg-status-error/10 transition-colors"
            onClick={() => handleAction("delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      )}
      {ListItemConfirmDialog}
    </>
  );
}

// ---------------------------------------------------------------------------
// Resizable Panel Hook
// ---------------------------------------------------------------------------

function useResizablePanel() {
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Load saved width on mount
  useEffect(() => {
    setPanelWidth(getSavedPanelWidth());
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [panelWidth]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(
        PANEL_MAX_WIDTH,
        Math.max(PANEL_MIN_WIDTH, startWidth.current + delta),
      );
      setPanelWidth(newWidth);
    }

    function handleMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Persist to localStorage
      try {
        localStorage.setItem(PANEL_STORAGE_KEY, String(panelWidth));
      } catch (error) {
        reportNonCriticalFailure({
          area: "feedback-inbox",
          operation: "save-panel-width",
          error,
          userVisibleFallback: "Feedback inbox panel width was not saved locally.",
          metadata: { panelWidth },
        });
      }
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [panelWidth]);

  return { panelWidth, handleMouseDown };
}

// ---------------------------------------------------------------------------
// Tool Context Section
// ---------------------------------------------------------------------------

type ToolOption = { id: number; name: string; slug: string; category: string };
type ToolContextData = {
  tool_name: string;
  procore_url: string | null;
  prp_path: string | null;
  research_folder: string;
  manifest_path: string;
  crawl_command: string;
};

function ToolContextSection({ item }: { item: FeedbackItem }) {
  const [tools, setTools] = useState<ToolOption[]>([]);
  const [assignedToolId, setAssignedToolId] = useState<number | null>(null);
  const [context, setContext] = useState<ToolContextData | null>(null);
  const [loading, setLoading] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load tools list and auto-match on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        // Fetch tools list and auto-match in parallel
        const [toolsResult, matchResult] = await Promise.allSettled([
          apiFetch<{ tools?: ToolOption[] }>(
            "/api/admin/feedback/tools?action=list",
          ),
          apiFetch<{
            match?: { id: number };
            context?: ToolContextData | null;
          }>(`/api/admin/feedback/tools?action=match&feedbackId=${item.id}`),
        ]);

        if (cancelled) return;

        if (toolsResult.status === "fulfilled") {
          setTools(toolsResult.value.tools ?? []);
        } else {
          reportNonCriticalFailure({
            area: "feedback-inbox",
            operation: "load-feedback-tools",
            error: toolsResult.reason,
            userVisibleFallback: "Tool assignment options could not be loaded.",
            metadata: { feedbackId: item.id },
          });
        }

        if (matchResult.status === "fulfilled") {
          const data = matchResult.value;
          if (data.match) {
            setAssignedToolId(data.match.id);
            setContext(data.context ?? null);
          }
        } else {
          reportNonCriticalFailure({
            area: "feedback-inbox",
            operation: "match-feedback-tool",
            error: matchResult.reason,
            userVisibleFallback: "Feedback tool auto-match could not be loaded.",
            metadata: { feedbackId: item.id },
          });
        }
      } catch (error) {
        reportNonCriticalFailure({
          area: "feedback-inbox",
          operation: "initialize-tool-context",
          error,
          userVisibleFallback: "Tool context could not be initialized.",
          metadata: { feedbackId: item.id },
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [item.id]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  async function handleAssign(toolId: number) {
    setShowDropdown(false);
    setLoading(true);
    try {
      await apiFetch("/api/admin/feedback/tools", {
        method: "POST",
        body: JSON.stringify({ feedbackId: item.id, toolId }),
      });
      setAssignedToolId(toolId);
      // Fetch resolved context
      try {
        const data = await apiFetch<{ context?: ToolContextData | null }>(
          `/api/admin/feedback/tools?action=resolve&toolId=${toolId}`,
        );
        setContext(data.context ?? null);
      } catch (err) {
        reportNonCriticalFailure({
          area: "feedback-inbox",
          operation: "load-assigned-tool-context",
          error: err,
          userVisibleFallback: "Tool assignment saved, but context could not be loaded.",
          metadata: { feedbackId: item.id, toolId },
        });
      }
      toast.success("Tool assigned");
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "assign-tool",
        title: "Could not assign tool",
        fallback: "The feedback tool assignment could not be saved.",
        error: err,
        metadata: { feedbackId: item.id, toolId },
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoMatch() {
    setLoading(true);
    try {
      const data = await apiFetch<{ item?: { tool_id?: number | null } }>(
        "/api/admin/feedback/tools",
        {
          method: "POST",
          body: JSON.stringify({ feedbackId: item.id, toolId: null, auto: true }),
        },
      );
      const newToolId = data.item?.tool_id;
      setAssignedToolId(newToolId ?? null);
      if (newToolId) {
        try {
          const ctxData = await apiFetch<{ context?: ToolContextData | null }>(
            `/api/admin/feedback/tools?action=resolve&toolId=${newToolId}`,
          );
          setContext(ctxData.context ?? null);
        } catch (err) {
          reportNonCriticalFailure({
            area: "feedback-inbox",
            operation: "load-auto-matched-tool-context",
            error: err,
            userVisibleFallback: "Tool auto-match saved, but context could not be loaded.",
            metadata: { feedbackId: item.id, toolId: newToolId },
          });
        }
        toast.success("Tool auto-matched");
      } else {
        setContext(null);
        toast("No matching tool found", { description: "Assign one manually." });
      }
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "auto-match-tool",
        title: "Could not auto-match tool",
        fallback: "The feedback tool could not be auto-matched.",
        error: err,
        metadata: { feedbackId: item.id },
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCrawl() {
    if (!context) return;
    const slug = tools.find((t) => t.id === assignedToolId)?.slug;
    if (!slug) return;

    setCrawling(true);
    try {
      await apiFetch("/api/admin/feedback/crawl", {
        method: "POST",
        body: JSON.stringify({ slug }),
      });
      toast.success("Procore crawl complete", { description: `Manifest saved for ${slug}` });
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "crawl-tool-context",
        title: "Could not crawl Procore context",
        fallback: "The Procore context crawl failed.",
        error: err,
        metadata: {
          feedbackId: item.id,
          toolSlug: slug,
        },
      });
    } finally {
      setCrawling(false);
    }
  }

  const assignedTool = tools.find((t) => t.id === assignedToolId);

  return (
    <div>
      {/* Tool assignment */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative" ref={dropdownRef}>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground transition-colors"
          >
            <Wrench className="h-3 w-3 text-muted-foreground" />
            {assignedTool ? assignedTool.name : "Assign tool"}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>

          {showDropdown && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-56 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-sm">
              {tools.map((tool) => (
                <Button
                  key={tool.id}
                  type="button"
                  variant="ghost"
                  size="default"
                  onClick={() => handleAssign(tool.id)}
                  className={cn(
                    "h-auto w-full justify-start gap-2 rounded-sm px-2 py-1.5 text-left text-xs font-normal transition-colors hover:bg-muted",
                    tool.id === assignedToolId && "bg-primary/10 text-primary",
                  )}
                >
                  <span className="truncate">{tool.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{tool.category}</span>
                </Button>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleAutoMatch}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          title="Auto-detect tool from feedback content"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          Auto-match
        </Button>
      </div>

      {/* Resolved context */}
      {context && (
        <div className="space-y-1.5 rounded-md bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-20 shrink-0">Tool</span>
            <span className="font-medium text-foreground">{context.tool_name}</span>
          </div>
          {context.procore_url && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-20 shrink-0">Procore</span>
              <a
                href={context.procore_url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-mono text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Link2 className="h-3 w-3 shrink-0" />
                {context.procore_url.replace(/https?:\/\/[^/]+/, "")}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-20 shrink-0">PRP</span>
            <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              {context.prp_path}
            </code>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-20 shrink-0">Research</span>
            <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              {context.research_folder}
            </code>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-20 shrink-0">Manifest</span>
            <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              {context.manifest_path}
            </code>
          </div>

          {/* Crawl button */}
          <div className="pt-2">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={handleCrawl}
              disabled={crawling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {crawling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              {crawling ? "Crawling Procore..." : "Crawl Procore"}
            </Button>
          </div>
        </div>
      )}

      {!context && !loading && (
        <EmptyState
          icon={<Wrench />}
          title="No tool matched"
          description="Assign one manually or click Auto-match."
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Panel (shared between desktop and mobile)
// ---------------------------------------------------------------------------

function FeedbackDetail({
  item,
  updatingId,
  sendingToGitHub,
  dispatchingId,
  deletingId,
  onUpdateStatus,
  onSendToGitHub,
  onDispatchToAgent,
  onDelete,
  onBack,
  commentInputRef,
}: {
  item: FeedbackItem;
  updatingId: string | null;
  sendingToGitHub: boolean;
  dispatchingId: string | null;
  deletingId: string | null;
  onUpdateStatus: (id: string, status: DisplayStatus) => void;
  onSendToGitHub: (id: string) => void;
  onDispatchToAgent: (id: string, target: AgentTarget) => void;
  onDelete: (id: string) => void;
  onBack?: () => void;
  commentInputRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const displayStatus = toDisplayStatus(item.status);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { confirm: confirmDetailDelete, ConfirmDialog: DetailConfirmDialog } = useConfirm();
  const displayTitle = displayAdminFeedbackTitle({
    storedTitle: item.title,
    requestType: item.request_type,
    comment: item.comment,
    targetText: item.target_text,
    pageTitle: item.page_title,
  });

  useEffect(() => {
    if (!lightboxImage) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxImage(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxImage]);

  return (
    <>
    {DetailConfirmDialog}
    <div className="mx-auto max-w-5xl space-y-6 px-5 py-5 lg:px-8 lg:py-7">
      {/* Mobile back button */}
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-2 gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      )}

      {/* Header + Actions */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-foreground">
              {displayTitle}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="inline-flex items-center gap-1 rounded px-1 -mx-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => {
                  navigator.clipboard.writeText(item.id);
                  toast.success("ID copied to clipboard");
                }}
                title={`Copy full ID: ${item.id}`}
              >
                <span className="font-sans text-xs font-medium text-muted-foreground">
                  ID:
                </span>
                {item.id.slice(0, 8)}
              </Button>
              <span className="text-border">·</span>
              <span>
                {REQUEST_TYPE_LABELS[item.request_type] ?? item.request_type}
              </span>
              <span className="text-border">·</span>
              <span>Submitted by {submitterLabel(item)}</span>
              {item.severity && (
                <>
                  <span className="text-border">·</span>
                  <span className={cn(
                    "font-medium",
                    item.severity === "high" && "text-status-error",
                    item.severity === "medium" && "text-status-warning",
                    item.severity === "low" && "text-muted-foreground",
                  )}>
                    {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)} priority
                  </span>
                </>
              )}
              <span className="text-border">·</span>
              <span>
                {new Date(item.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-border">·</span>
              <a
                href={item.page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-foreground transition-colors hover:text-muted-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                Open referenced page
              </a>
            </div>
          </div>

          {/* Delete in corner */}
          <Button
            size="icon-sm"
            variant="ghost"
            className="shrink-0 text-muted-foreground hover:text-status-error hover:bg-status-error/10"
            onClick={async () => {
              const ok = await confirmDetailDelete({
                description: "Delete this feedback item? This cannot be undone.",
                variant: "destructive",
                confirmLabel: "Delete",
              });
              if (ok) onDelete(item.id);
            }}
            disabled={deletingId === item.id}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Inline actions */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span>Status</span>
          <Select
              value={displayStatus}
            onValueChange={(value) => onUpdateStatus(item.id, value as DisplayStatus)}
              disabled={updatingId === item.id}
          >
            <SelectTrigger
              aria-label="Feedback status"
              size="sm"
              className={cn(
                "h-auto w-auto min-w-24 border-0 bg-transparent px-0 py-0 text-xs font-medium shadow-none hover:bg-transparent focus-visible:ring-1",
                displayStatus === "resolved" && "text-status-success",
                displayStatus === "open" && "text-status-warning",
                displayStatus === "in_progress" && "text-status-info",
                displayStatus === "deferred" && "text-muted-foreground",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </span>

          {/* GitHub */}
          {!item.github_issue_number && (
            <Button
              size="xs"
              variant="link"
              onClick={() => onSendToGitHub(item.id)}
              disabled={sendingToGitHub}
              className="h-auto p-0 text-xs font-medium"
            >
              {sendingToGitHub ? "Sending..." : "Create Issue"}
            </Button>
          )}
          {item.github_issue_url && (
            <a
              href={item.github_issue_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-3 w-3" />
              #{item.github_issue_number}
            </a>
          )}
        </div>

        <div className="mt-3">
          <AgentDispatchSection
            item={item}
            dispatching={dispatchingId === item.id}
            onDispatch={onDispatchToAgent}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-3">
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {item.comment}
        </p>

        {/* Screenshot */}
        {item.screenshot_url && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setLightboxImage(item.screenshot_url)}
            className="group block h-auto w-full overflow-hidden rounded-md border border-border/60 p-0 text-left transition-colors hover:border-border hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Open feedback screenshot"
          >
            <img
              src={item.screenshot_url}
              alt="Feedback screenshot"
              className="w-full max-h-75 object-cover object-top transition-opacity group-hover:opacity-95"
            />
          </Button>
        )}
      </div>

      <CollapsibleDetailSection key={`${item.id}-page-context`} label="Page Context">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 text-muted-foreground">Page</span>
            <a
              href={item.page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-mono text-xs text-foreground hover:underline"
            >
              {item.page_path}
            </a>
          </div>
          {item.page_title && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 text-muted-foreground">Title</span>
              <span className="text-foreground">{item.page_title}</span>
            </div>
          )}
          {item.target_text && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 text-muted-foreground">Element</span>
              <span className="truncate text-foreground">{item.target_text}</span>
            </div>
          )}
          {item.target_selector && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 text-muted-foreground">Selector</span>
              <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                {item.target_selector}
              </code>
            </div>
          )}
          {item.project_id && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 text-muted-foreground">Project</span>
              <span className="text-foreground">#{item.project_id}</span>
            </div>
          )}
        </div>
      </CollapsibleDetailSection>

      <CollapsibleDetailSection key={`${item.id}-tool-context`} label="Tool Context">
        <ToolContextSection item={item} />
      </CollapsibleDetailSection>

      {/* Source Metadata */}
      {item.metadata && Object.keys(item.metadata).length > 0 && (
        <CollapsibleDetailSection key={`${item.id}-source-metadata`} label="Source Metadata">
          <div className="space-y-1.5">
            {Object.entries(item.metadata as Record<string, unknown>).map(([key, value]) => {
              const label = key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (c) => c.toUpperCase())
                .trim();
              const displayValue =
                value === null || value === undefined
                  ? "—"
                  : typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value);
              return (
                <div key={key} className="flex items-start gap-2 text-xs">
                  <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
                  <span className="text-foreground break-all">{displayValue}</span>
                </div>
              );
            })}
          </div>
        </CollapsibleDetailSection>
      )}

      {/* Comments */}
      <div>
        <CommentsSection feedbackItemId={item.id} commentInputRef={commentInputRef} />
      </div>

      {/* GitHub Activity */}
      {item.github_issue_number && (
        <CollapsibleDetailSection
          key={`${item.id}-github-activity`}
          label={`GitHub Activity · #${item.github_issue_number}`}
        >
          <GitHubActivitySection issueNumber={item.github_issue_number} />
        </CollapsibleDetailSection>
      )}
    </div>

    {lightboxImage && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setLightboxImage(null);
          }
        }}
      >
        <img
          src={lightboxImage}
          alt="Feedback screenshot enlarged"
          className="max-h-full max-w-full object-contain"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setLightboxImage(null)}
          className="absolute right-4 top-4 bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground"
          aria-label="Close screenshot"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Inbox Queue
// ---------------------------------------------------------------------------

type FeedbackListSection = {
  status: DisplayStatus;
  label: string;
  items: FeedbackItem[];
};

function FeedbackQueueItem({
  item,
  itemIndex,
  selectedId,
  focusedIndex,
  onSelect,
  onUpdateStatus,
  onSendToGitHub,
  onDelete,
}: {
  item: FeedbackItem;
  itemIndex: number;
  selectedId: string | null;
  focusedIndex: number;
  onSelect: (id: string) => void;
  onUpdateStatus: (id: string, status: DisplayStatus) => void;
  onSendToGitHub: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const displayStatus = toDisplayStatus(item.status);
  const meta = STATUS_META[displayStatus];
  const isSelected = selectedId === item.id;
  const isFocused = focusedIndex === itemIndex;
  const itemDisplayTitle = displayAdminFeedbackTitle({
    storedTitle: item.title,
    requestType: item.request_type,
    comment: item.comment,
    targetText: item.target_text,
    pageTitle: item.page_title,
  });
  const toolLabel = toolLabelFromPath(item.page_path);

  return (
    <ListItemContextMenu
      item={item}
      onUpdateStatus={onUpdateStatus}
      onSendToGitHub={onSendToGitHub}
      onDelete={onDelete}
    >
      <Button
        type="button"
        data-feedback-item
        variant="ghost"
        size="default"
        onClick={() => onSelect(item.id)}
        className={cn(
          "group h-auto w-full items-start justify-start gap-3 rounded-none border-b border-border/50 px-4 py-3 text-left transition-colors",
          isSelected
            ? "bg-card shadow-[inset_2px_0_0_hsl(var(--primary))]"
            : "hover:bg-card/70",
          isFocused && !isSelected && "bg-card/60",
        )}
      >
        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
          <span className={cn("h-2 w-2 rounded-full", meta.dotClassName)} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="line-clamp-1 text-sm font-semibold leading-normal text-foreground">
                {itemDisplayTitle}
              </span>
              <span className="mt-1 line-clamp-2 text-sm font-normal leading-relaxed text-muted-foreground">
                {item.comment}
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {relativeTime(item.created_at)}
            </span>
          </span>

          <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{REQUEST_TYPE_LABELS[item.request_type] ?? item.request_type}</span>
            {toolLabel && (
              <>
                <span className="text-border">/</span>
                <span>{toolLabel}</span>
              </>
            )}
            <span className="text-border">/</span>
            <span>Submitted by {submitterLabel(item)}</span>
            {item.github_issue_number && (
              <>
                <span className="text-border">/</span>
                <span className="inline-flex items-center gap-1">
                  <Github className="h-3 w-3" />
                  #{item.github_issue_number}
                </span>
              </>
            )}
            {item.severity === "high" && (
              <>
                <span className="text-border">/</span>
                <span className="font-medium text-status-error">High priority</span>
              </>
            )}
          </span>
        </span>
      </Button>
    </ListItemContextMenu>
  );
}

function FeedbackQueue({
  sections,
  items,
  selectedId,
  focusedIndex,
  loading,
  currentFilterLabel,
  onSelect,
  onUpdateStatus,
  onSendToGitHub,
  onDelete,
}: {
  sections: FeedbackListSection[];
  items: FeedbackItem[];
  selectedId: string | null;
  focusedIndex: number;
  loading: boolean;
  currentFilterLabel: string;
  onSelect: (id: string) => void;
  onUpdateStatus: (id: string, status: DisplayStatus) => void;
  onSendToGitHub: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-48 items-center justify-center">
        <EmptyState
          icon={<CheckCircle2 />}
          title="No feedback items"
          description={`No ${currentFilterLabel.toLowerCase()} items found.`}
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {sections.map((section) => (
        <section key={section.status} className="bg-background">
          {sections.length > 1 && (
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-background/95 px-4 py-2 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <span className="text-xs text-muted-foreground">
                {section.items.length}
              </span>
            </div>
          )}
          {section.items.map((item) => {
            const itemIndex = items.findIndex((entry) => entry.id === item.id);
            return (
              <FeedbackQueueItem
                key={item.id}
                item={item}
                itemIndex={itemIndex}
                selectedId={selectedId}
                focusedIndex={focusedIndex}
                onSelect={onSelect}
                onUpdateStatus={onUpdateStatus}
                onSendToGitHub={onSendToGitHub}
                onDelete={onDelete}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function FeedbackInboxPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FeedbackInboxTab>("issues");
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sendingToGitHub, setSendingToGitHub] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<InboxViewMode>("triage");

  const listPanelRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const { panelWidth, handleMouseDown } = useResizablePanel();

  useEffect(() => {
    setViewMode(getSavedViewMode());
  }, []);

  function changeViewMode(mode: InboxViewMode) {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch (error) {
      reportNonCriticalFailure({
        area: "feedback-inbox",
        operation: "save-view-mode",
        error,
        userVisibleFallback: "Feedback inbox view preference was not saved.",
        metadata: { mode },
      });
    }
  }

  function showDetailOnMobileOnly() {
    const isMobileViewport =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches;
    setMobileShowDetail(isMobileViewport);
  }

  const issueItems = useMemo(
    () => items.filter((item) => item.request_type !== "feature_request"),
    [items],
  );
  const featureRequestItems = useMemo(
    () => items.filter((item) => item.request_type === "feature_request"),
    [items],
  );
  const visibleItems = activeTab === "feature_requests" ? featureRequestItems : issueItems;
  const currentTabLabel =
    FEEDBACK_INBOX_TABS.find((tab) => tab.value === activeTab)?.label ?? "Issues";
  const visibleTotal = visibleItems.length;
  const selected = useMemo(
    () => visibleItems.find((i) => i.id === selectedId) ?? null,
    [visibleItems, selectedId],
  );
  const currentFilterLabel =
    STATUS_FILTERS.find((statusFilter) => statusFilter.value === filter)?.label ??
    filter.replace("_", " ");

  // ---- Fetch ----
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        if (filter === "open") {
          params.set("status", "open,submitted,github_failed");
        } else if (filter === "in_progress") {
          params.set("status", "in_progress,triaged,diagnosing,fixing,verifying,in_review");
        } else if (filter === "deferred") {
          params.set("status", "deferred");
        } else if (filter === "resolved") {
          params.set("status", "resolved,closed");
        } else {
          params.set("status", filter);
        }
      } else {
        params.set("status", "open,github_failed,submitted,in_progress,triaged,diagnosing,fixing,verifying,in_review,deferred,resolved,closed");
      }
      const data = await apiFetch<{ items?: FeedbackItem[]; total?: number }>(
        `/api/admin/feedback?${params.toString()}`,
      );
      setItems(data.items ?? []);
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "load-feedback-items",
        title: "Could not load feedback items",
        fallback: "The feedback inbox list could not be loaded.",
        error: err,
        metadata: { filter },
      });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Auto-select the most recent item when items load or current selection is invalid
  useEffect(() => {
    if (loading) return;
    if (visibleItems.length === 0) {
      if (selectedId) setSelectedId(null);
      setFocusedIndex(0);
      return;
    }
    const currentExists = selectedId && visibleItems.some((i) => i.id === selectedId);
    if (!currentExists) {
      setSelectedId(visibleItems[0].id);
      setFocusedIndex(0);
    }
  }, [loading, visibleItems, selectedId]);

  // Keep focusedIndex in sync with selectedId
  useEffect(() => {
    if (selectedId) {
      const idx = visibleItems.findIndex((i) => i.id === selectedId);
      if (idx >= 0) setFocusedIndex(idx);
    }
  }, [selectedId, visibleItems]);

  // ---- Keyboard Navigation ----
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (visibleItems.length === 0) return;
          const nextIdx = Math.min(focusedIndex + 1, visibleItems.length - 1);
          setFocusedIndex(nextIdx);
          setSelectedId(visibleItems[nextIdx].id);
          // Scroll the focused item into view
          const listEl = listPanelRef.current;
          if (listEl) {
            const buttons = listEl.querySelectorAll("[data-feedback-item]");
            buttons[nextIdx]?.scrollIntoView({ block: "nearest" });
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (visibleItems.length === 0) return;
          const prevIdx = Math.max(focusedIndex - 1, 0);
          setFocusedIndex(prevIdx);
          setSelectedId(visibleItems[prevIdx].id);
          const listEl = listPanelRef.current;
          if (listEl) {
            const buttons = listEl.querySelectorAll("[data-feedback-item]");
            buttons[prevIdx]?.scrollIntoView({ block: "nearest" });
          }
          break;
        }
        case "Enter": {
          if (visibleItems.length === 0) return;
          setSelectedId(visibleItems[focusedIndex].id);
          showDetailOnMobileOnly();
          break;
        }
        case "Escape": {
          setMobileShowDetail(false);
          break;
        }
        case "c": {
          e.preventDefault();
          commentInputRef.current?.focus();
          break;
        }
        case "g": {
          if (selected?.github_issue_url) {
            window.open(selected.github_issue_url, "_blank", "noopener,noreferrer");
          }
          break;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visibleItems, focusedIndex, selected]);

  // ---- Update status ----
  async function updateStatus(id: string, status: DisplayStatus) {
    setUpdatingId(id);
    try {
      await apiFetch("/api/admin/feedback", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      const statusLabel = STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
      toast.success(`Marked as ${statusLabel}`);
      fetchItems();
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "update-feedback-status",
        title: "Could not update status",
        fallback: "The feedback item status could not be updated.",
        error: err,
        metadata: { feedbackId: id, status },
      });
    } finally {
      setUpdatingId(null);
    }
  }

  // ---- Send to GitHub ----
  async function sendToGitHub(id: string) {
    setSendingToGitHub(true);
    try {
      const data = await apiFetch<{ githubIssue?: { number?: number } }>(
        "/api/admin/feedback",
        {
          method: "PUT",
          body: JSON.stringify({ id }),
        },
      );
      toast.success(
        `Created GitHub issue #${data.githubIssue?.number ?? ""}`,
      );
      fetchItems();
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "send-feedback-to-github",
        title: "Could not send to GitHub",
        fallback: "The feedback item could not be sent to GitHub.",
        error: err,
        metadata: { feedbackId: id },
      });
    } finally {
      setSendingToGitHub(false);
    }
  }

  // ---- Dispatch to agent ----
  async function dispatchToAgent(id: string, target: AgentTarget) {
    setDispatchingId(id);
    try {
      const data = await apiFetch<{
        cliCommand?: string;
        githubIssue?: { number?: number; url?: string } | null;
        trigger?: "github" | "metadata_queue";
      }>("/api/admin/feedback/dispatch", {
        method: "POST",
        body: JSON.stringify({ id, target, markInProgress: true }),
      });

      if (data.cliCommand) {
        try {
          await navigator.clipboard.writeText(data.cliCommand);
        } catch (clipboardError) {
          reportNonCriticalFailure({
            area: "feedback-inbox",
            operation: "copy-dispatch-command",
            error: clipboardError,
            userVisibleFallback: "Dispatch succeeded, but the command could not be copied.",
            metadata: { feedbackId: id, target },
          });
        }
      }

      const triggerLabel = data.trigger === "github" ? "GitHub" : "dispatch queue";
      const issueLabel = data.githubIssue?.number ? ` #${data.githubIssue.number}` : "";
      toast.success(`Dispatched to ${agentLabel(target)}`, {
        description: `${triggerLabel}${issueLabel}`,
      });
      fetchItems();
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "dispatch-feedback-agent",
        title: `Could not dispatch to ${agentLabel(target)}`,
        fallback: "The feedback item could not be queued for agent work.",
        error: err,
        metadata: { feedbackId: id, target },
      });
    } finally {
      setDispatchingId(null);
    }
  }

  // ---- Delete ----
  async function deleteItem(id: string) {
    setDeletingId(id);
    try {
      await apiFetch("/api/admin/feedback", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      toast.success("Feedback item deleted");
      if (selectedId === id) {
        setSelectedId(null);
        setMobileShowDetail(false);
      }
      fetchItems();
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "delete-feedback-item",
        title: "Could not delete feedback item",
        fallback: "The feedback item could not be deleted.",
        error: err,
        metadata: { feedbackId: id },
      });
    } finally {
      setDeletingId(null);
    }
  }

  // ---- Select item ----
  function selectItem(id: string) {
    setSelectedId(id);
    showDetailOnMobileOnly();
  }

  function handleMobileBack() {
    setMobileShowDetail(false);
  }

  const listSections = useMemo(() => {
    if (filter !== "all") {
      return visibleItems.length > 0
        ? [{
            status: filter as DisplayStatus,
            label: STATUS_META[filter as DisplayStatus].label,
            items: visibleItems,
          }]
        : [];
    }

    const grouped = new Map<DisplayStatus, FeedbackItem[]>(
      LIST_SECTION_ORDER.map((status) => [status, []]),
    );

    for (const item of visibleItems) {
      const status = toDisplayStatus(item.status);
      grouped.get(status)?.push(item);
    }

    return LIST_SECTION_ORDER
      .map((status) => ({
        status,
        label: STATUS_META[status].label,
        items: grouped.get(status) ?? [],
      }))
      .filter((section) => section.items.length > 0);
  }, [visibleItems, filter]);

  const queue = (
    <FeedbackQueue
      sections={listSections}
      items={visibleItems}
      selectedId={selectedId}
      focusedIndex={focusedIndex}
      loading={loading}
      currentFilterLabel={`${currentFilterLabel} ${currentTabLabel}`}
      onSelect={selectItem}
      onUpdateStatus={updateStatus}
      onSendToGitHub={sendToGitHub}
      onDelete={deleteItem}
    />
  );

  const inboxTabs = (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        setActiveTab(value as FeedbackInboxTab);
        setSelectedId(null);
        setMobileShowDetail(false);
        setFocusedIndex(0);
      }}
    >
      <TabsList className="h-8 w-full justify-start gap-1 rounded-md bg-muted/70 p-1 sm:w-auto">
        {FEEDBACK_INBOX_TABS.map((tab) => {
          const tabCount = tab.value === "feature_requests" ? featureRequestItems.length : issueItems.length;
          return (
            <TabsTrigger key={tab.value} value={tab.value} className="h-6 rounded-sm px-3 text-xs">
              {tab.label}
              <span className="ml-1.5 text-muted-foreground">
                {tabCount}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );

  const filters = (
    <Tabs
      value={filter}
      onValueChange={(v) => {
        setFilter(v as StatusFilter);
        setSelectedId(null);
        setMobileShowDetail(false);
      }}
    >
      <TabsList className="h-8 w-full justify-start gap-1 rounded-md bg-muted/70 p-1 sm:w-auto">
        {STATUS_FILTERS.map((f) => (
          <TabsTrigger key={f.value} value={f.value} className="h-6 rounded-sm px-3 text-xs">
            {f.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  const viewSwitcher = (
    <div className="inline-flex rounded-md bg-muted/70 p-1">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => changeViewMode("triage")}
        className={cn(
          "h-6 gap-1.5 rounded-sm px-2 text-xs text-muted-foreground hover:bg-background hover:text-foreground",
          viewMode === "triage" && "bg-background text-foreground shadow-xs",
        )}
      >
        <List className="h-3.5 w-3.5" />
        Triage
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => changeViewMode("split")}
        className={cn(
          "h-6 gap-1.5 rounded-sm px-2 text-xs text-muted-foreground hover:bg-background hover:text-foreground",
          viewMode === "split" && "bg-background text-foreground shadow-xs",
        )}
      >
        <PanelRightOpen className="h-3.5 w-3.5" />
        Split pane
      </Button>
    </div>
  );

  return (
    <PageShell
      variant="dashboard"
      title="Feedback Inbox"
      showHeader={false}
      className="bg-background px-0! py-0!"
      contentClassName="space-y-0 pt-0 pb-0"
      fillHeight
      description="Review feedback, assign tools, and sync issues to GitHub."
    >
      <div className="flex h-full min-h-0 flex-col bg-background">
        <header className="border-b border-border/60 bg-background px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Feedback Inbox
                </h1>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {visibleTotal} {visibleTotal === 1 ? "item" : "items"}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between xl:justify-end">
              {inboxTabs}
              {filters}
              {viewSwitcher}
            </div>
          </div>
        </header>

        {mobileShowDetail && selected ? (
          <div className="flex flex-1 flex-col overflow-y-auto bg-background lg:hidden">
            <FeedbackDetail
              item={selected}
              updatingId={updatingId}
              sendingToGitHub={sendingToGitHub}
              dispatchingId={dispatchingId}
              onUpdateStatus={updateStatus}
              onSendToGitHub={sendToGitHub}
              onDispatchToAgent={dispatchToAgent}
              deletingId={deletingId}
              onDelete={deleteItem}
              onBack={handleMobileBack}
              commentInputRef={commentInputRef}
            />
          </div>
        ) : viewMode === "split" ? (
          <div className="flex min-h-0 flex-1">
            <div
              ref={listPanelRef}
              className={cn(
                "flex flex-col border-r border-border/60 bg-background",
                mobileShowDetail ? "hidden lg:flex" : "flex",
                "w-full lg:w-auto lg:shrink-0",
              )}
              style={{ width: panelWidth, minWidth: PANEL_MIN_WIDTH, maxWidth: PANEL_MAX_WIDTH }}
            >
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
                <p className="text-sm font-semibold text-foreground">
                  {currentTabLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentFilterLabel}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto bg-muted/20">
                {queue}
              </div>
            </div>

            <div
              className="group hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-muted/50 active:bg-muted lg:flex"
              onMouseDown={handleMouseDown}
              aria-hidden="true"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
            </div>

            <div className="hidden flex-1 overflow-y-auto bg-background lg:block">
              {!selected && (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Select an item to review
                  </p>
                </div>
              )}

              {selected && (
                <FeedbackDetail
                  item={selected}
                  updatingId={updatingId}
                  sendingToGitHub={sendingToGitHub}
                  dispatchingId={dispatchingId}
                  deletingId={deletingId}
                  onUpdateStatus={updateStatus}
                  onSendToGitHub={sendToGitHub}
                  onDispatchToAgent={dispatchToAgent}
                  onDelete={deleteItem}
                  commentInputRef={commentInputRef}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20">
            <div className="mx-auto grid w-full max-w-screen-2xl gap-6 px-4 py-4 lg:grid-cols-2 lg:px-6">
              <section
                ref={listPanelRef}
                className="min-h-0 overflow-hidden rounded-lg bg-card shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {currentFilterLabel} {currentTabLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Use arrow keys to move through the queue.
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {visibleTotal}
                  </span>
                </div>
                {queue}
              </section>

              <section className="hidden min-h-0 overflow-hidden rounded-lg bg-card shadow-xs lg:block">
                {selected ? (
                  <div className="max-h-screen overflow-y-auto">
                    <FeedbackDetail
                      item={selected}
                      updatingId={updatingId}
                      sendingToGitHub={sendingToGitHub}
                      dispatchingId={dispatchingId}
                      deletingId={deletingId}
                      onUpdateStatus={updateStatus}
                      onSendToGitHub={sendToGitHub}
                      onDispatchToAgent={dispatchToAgent}
                      onDelete={deleteItem}
                      commentInputRef={commentInputRef}
                    />
                  </div>
                ) : (
                  <div className="flex h-full min-h-96 items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Select an item to review
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
