"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Copy,
  ExternalLink,
  GitBranch,
  Github,
  GripVertical,
  Hash,
  Image as ImageIcon,
  Link2,
  Loader2,
  MessageSquare,
  Play,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  Wrench,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
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

type StatusFilter = "open" | "in_progress" | "resolved" | "all";
type DisplayStatus = Exclude<StatusFilter, "all">;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

const STATUS_OPTIONS: { value: DisplayStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const STATUS_META: Record<DisplayStatus, { icon: typeof Circle; className: string; dotClassName: string; label: string; showInList?: boolean }> = {
  open: {
    icon: Circle,
    className: "text-status-warning",
    dotClassName: "bg-status-warning",
    label: "Open",
  },
  in_progress: {
    icon: Loader2,
    className: "text-status-info",
    dotClassName: "bg-status-info animate-pulse",
    label: "In Progress",
    showInList: true,
  },
  resolved: {
    icon: ShieldCheck,
    className: "text-status-success",
    dotClassName: "bg-status-success",
    label: "Resolved",
    showInList: true,
  },
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  change_request: "Change request",
  copy: "Copy",
  question: "Question",
};

const REQUEST_TYPE_META: Record<
  string,
  { icon: typeof Wrench; className: string; shortLabel: string }
> = {
  change_request: {
    icon: Wrench,
    className: "text-status-info",
    shortLabel: "Change",
  },
  bug: {
    icon: XCircle,
    className: "text-status-error",
    shortLabel: "Bug",
  },
  question: {
    icon: MessageSquare,
    className: "text-status-info",
    shortLabel: "Question",
  },
  copy: {
    icon: Copy,
    className: "text-muted-foreground",
    shortLabel: "Copy",
  },
};


const PANEL_MIN_WIDTH = 280;
const PANEL_MAX_WIDTH = 600;
const PANEL_DEFAULT_WIDTH = 480;
const PANEL_STORAGE_KEY = "feedback-inbox-panel-width";
const IN_PROGRESS_STATUSES = new Set([
  "submitted",
  "in_progress",
  "triaged",
  "diagnosing",
  "fixing",
  "verifying",
  "in_review",
]);
const RESOLVED_STATUSES = new Set(["resolved", "closed"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  if (RESOLVED_STATUSES.has(status)) return "resolved";
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
  } catch {
    // ignore
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
        <code key={`${keyPrefix}-${i}`} className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">
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
        <pre key={`code-${i}`} className="my-1.5 overflow-x-auto rounded bg-muted px-3 py-2 text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
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
    reader.onerror = () => toast.error("Failed to read image file.");
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
        <div className="absolute bottom-full left-0 right-0 mb-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-popover shadow-sm z-10">
          {filteredUsers.map((user, i) => (
            <Button
              key={user.id}
              type="button"
              variant="ghost"
              size="default"
              className={cn(
                "h-auto w-full justify-start gap-2 rounded-none px-3 py-2 text-left text-sm font-normal",
                i === mentionIndex ? "bg-muted" : "hover:bg-muted/50",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(user);
              }}
              onMouseEnter={() => setMentionIndex(i)}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                {getInitials(user)}
              </span>
              <span className="truncate font-medium text-foreground">
                {displayName(user)}
              </span>
              <span className="truncate text-xs text-muted-foreground">
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      <div className="rounded-lg border border-border bg-background focus-within:ring-1 focus-within:ring-ring">
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
            <span className="text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border px-1 py-0.5 text-[9px]">&#8984;Enter</kbd>
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
    } catch {
      // silent
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
    } catch {
      // silent
    }
  }, []);

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
      toast.error(err instanceof Error ? err.message : "Failed to add comment");
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
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/70 mb-2">
        Comments
      </p>

      {/* Comment list */}
      <div ref={scrollRef} className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}

        {!loading && comments.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">
            No comments yet. Be the first to comment.
          </p>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary mt-0.5">
              {getInitials(comment.author)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-foreground">
                  {displayName(comment.author)}
                </span>
                <span className="text-[10px] text-muted-foreground">
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
      <div className="flex items-center gap-2 mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/70">
          GitHub Activity
        </p>
        <span className="text-[10px] text-muted-foreground">
          #{issueNumber}
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive py-2">
          {error}
        </p>
      )}

      {!loading && !error && comments.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">
          No GitHub comments yet.
        </p>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2.5">
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
                  <Badge variant="outline" className="h-4 px-1.5 py-0 text-[9px] font-medium text-status-info border-status-info/30 dark:border-status-info/50">
                    Claude Code
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
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
              Re-open
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
      } catch {
        // ignore
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
        }

        if (matchResult.status === "fulfilled") {
          const data = matchResult.value;
          if (data.match) {
            setAssignedToolId(data.match.id);
            setContext(data.context ?? null);
          }
        }
      } catch {
        // Non-fatal
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
      } catch {
        // Non-fatal — assignment succeeded even if context load failed
      }
      toast.success("Tool assigned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign tool");
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
        } catch {
          // Non-fatal
        }
        toast.success("Tool auto-matched");
      } else {
        setContext(null);
        toast("No matching tool found", { description: "Assign one manually." });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auto-match failed");
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
      toast.error("Crawl failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setCrawling(false);
    }
  }

  const assignedTool = tools.find((t) => t.id === assignedToolId);

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/70 mb-2">
        Tool Context
      </p>

      {/* Tool assignment */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative" ref={dropdownRef}>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors"
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
                  <span className="ml-auto text-[10px] text-muted-foreground">{tool.category}</span>
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
        <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-3">
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
                className="truncate font-mono text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                <Link2 className="h-3 w-3 shrink-0" />
                {context.procore_url.replace(/https?:\/\/[^/]+/, "")}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-20 shrink-0">PRP</span>
            <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              {context.prp_path}
            </code>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-20 shrink-0">Research</span>
            <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              {context.research_folder}
            </code>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-20 shrink-0">Manifest</span>
            <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
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
        <p className="text-xs text-muted-foreground">
          No tool matched. Assign one manually or click Auto-match.
        </p>
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
  deletingId,
  onUpdateStatus,
  onSendToGitHub,
  onDelete,
  onBack,
  commentInputRef,
}: {
  item: FeedbackItem;
  updatingId: string | null;
  sendingToGitHub: boolean;
  deletingId: string | null;
  onUpdateStatus: (id: string, status: DisplayStatus) => void;
  onSendToGitHub: (id: string) => void;
  onDelete: (id: string) => void;
  onBack?: () => void;
  commentInputRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const displayStatus = toDisplayStatus(item.status);
  const { confirm: confirmDetailDelete, ConfirmDialog: DetailConfirmDialog } = useConfirm();

  return (
    <>
    {DetailConfirmDialog}
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-6 lg:px-10 lg:py-8">
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
            <h2 className="text-lg font-semibold text-foreground">
              {item.title}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="inline-flex items-center gap-1 rounded px-1 -mx-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => {
                  navigator.clipboard.writeText(item.id);
                  toast.success("ID copied to clipboard");
                }}
                title={`Copy full ID: ${item.id}`}
              >
                <Hash className="h-3 w-3" />
                {item.id.slice(0, 8)}
              </Button>
              <span className="text-border">·</span>
              <span>
                {REQUEST_TYPE_LABELS[item.request_type] ?? item.request_type}
              </span>
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Status dropdown */}
          <div className="relative">
            <select
              value={displayStatus}
              onChange={(e) => onUpdateStatus(item.id, e.target.value as DisplayStatus)}
              disabled={updatingId === item.id}
              className={cn(
                "h-7 appearance-none rounded-md border-0 pl-2 pr-7 text-xs font-medium cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
                displayStatus === "resolved" && "bg-status-success/15 text-status-success",
                displayStatus === "open" && "bg-status-warning/15 text-status-warning",
                displayStatus === "in_progress" && "bg-status-info/15 text-status-info",
              )}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 opacity-50" />
          </div>

          {/* GitHub */}
          {!item.github_issue_number && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSendToGitHub(item.id)}
              disabled={sendingToGitHub}
              className="h-7 text-xs"
            >
              <Github />
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
      </div>

      {/* Description */}
      <div>
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {item.comment}
        </p>

        {/* Screenshot */}
        {item.screenshot_url && (
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <img
              src={item.screenshot_url}
              alt="Feedback screenshot"
              className="w-full max-h-75 object-cover object-top"
            />
          </div>
        )}
      </div>

      {/* Page context */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary/70">
          Page Context
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 text-muted-foreground">Page</span>
            <a
              href={item.page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-mono text-[11px] text-foreground hover:underline"
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
              <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
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
      </div>

      <ToolContextSection item={item} />

      {/* Comments */}
      <CommentsSection feedbackItemId={item.id} commentInputRef={commentInputRef} />

      {/* GitHub Activity */}
      {item.github_issue_number && (
        <GitHubActivitySection issueNumber={item.github_issue_number} />
      )}
    </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function FeedbackInboxPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("in_progress");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sendingToGitHub, setSendingToGitHub] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const listPanelRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const { panelWidth, handleMouseDown } = useResizablePanel();

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  // ---- Fetch ----
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        if (filter === "open") {
          params.set("status", "open,github_failed");
        } else if (filter === "in_progress") {
          params.set("status", "submitted,triaged,diagnosing,fixing,verifying,in_review");
        } else if (filter === "resolved") {
          params.set("status", "resolved,closed");
        } else {
          params.set("status", filter);
        }
      }
      const data = await apiFetch<{ items?: FeedbackItem[]; total?: number }>(
        `/api/admin/feedback?${params.toString()}`,
      );
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load feedback items");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Auto-select the most recent item when items load or current selection is invalid
  useEffect(() => {
    if (loading || items.length === 0) return;
    const currentExists = selectedId && items.some((i) => i.id === selectedId);
    if (!currentExists) {
      setSelectedId(items[0].id);
      setFocusedIndex(0);
    }
  }, [loading, items, selectedId]);

  // Keep focusedIndex in sync with selectedId
  useEffect(() => {
    if (selectedId) {
      const idx = items.findIndex((i) => i.id === selectedId);
      if (idx >= 0) setFocusedIndex(idx);
    }
  }, [selectedId, items]);

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
          if (items.length === 0) return;
          const nextIdx = Math.min(focusedIndex + 1, items.length - 1);
          setFocusedIndex(nextIdx);
          setSelectedId(items[nextIdx].id);
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
          if (items.length === 0) return;
          const prevIdx = Math.max(focusedIndex - 1, 0);
          setFocusedIndex(prevIdx);
          setSelectedId(items[prevIdx].id);
          const listEl = listPanelRef.current;
          if (listEl) {
            const buttons = listEl.querySelectorAll("[data-feedback-item]");
            buttons[prevIdx]?.scrollIntoView({ block: "nearest" });
          }
          break;
        }
        case "Enter": {
          if (items.length === 0) return;
          setSelectedId(items[focusedIndex].id);
          setMobileShowDetail(true);
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
  }, [items, focusedIndex, selected]);

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
      toast.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
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
      toast.error(
        err instanceof Error ? err.message : "Failed to send to GitHub",
      );
    } finally {
      setSendingToGitHub(false);
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
      toast.error(err instanceof Error ? err.message : "Failed to delete feedback item");
    } finally {
      setDeletingId(null);
    }
  }

  // ---- Select item ----
  function selectItem(id: string) {
    setSelectedId(id);
    setMobileShowDetail(true);
  }

  function handleMobileBack() {
    setMobileShowDetail(false);
  }

  return (
    <PageShell
      variant="dashboard"
      title="Feedback Inbox"
      showHeader={false}
      className="px-0! py-0!"
      description="Review feedback, assign tools, and sync issues to GitHub."
    >
      <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-1 min-h-0">
        {/* ---- Left: list panel ---- */}
        <div
          ref={listPanelRef}
          className={cn(
            "flex flex-col border-r border-border",
            mobileShowDetail ? "hidden lg:flex" : "flex",
            "w-full lg:w-auto lg:shrink-0",
          )}
          style={{ width: panelWidth, minWidth: PANEL_MIN_WIDTH, maxWidth: PANEL_MAX_WIDTH }}
        >
          {/* Panel header: item count + keyboard hints */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-xs text-muted-foreground">
              {total} {total === 1 ? "item" : "items"}
            </span>
            <p className="text-[10px] text-muted-foreground hidden lg:block">
              <kbd className="rounded border border-border px-1 py-0.5 text-[9px]">&uarr;&darr;</kbd> navigate
              <span className="mx-1.5 text-border">|</span>
              <kbd className="rounded border border-border px-1 py-0.5 text-[9px]">c</kbd> comment
              <span className="mx-1.5 text-border">|</span>
              <kbd className="rounded border border-border px-1 py-0.5 text-[9px]">g</kbd> github
            </p>
          </div>
          {/* Filter tabs */}
          <div className="border-b border-border px-3 py-2">
            <Tabs
              value={filter}
              onValueChange={(v) => {
                setFilter(v as StatusFilter);
                setSelectedId(null);
                setMobileShowDetail(false);
              }}
            >
              <TabsList>
                {STATUS_FILTERS.map((f) => (
                  <TabsTrigger key={f.value} value={f.value} className="text-xs">
                    {f.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto bg-muted/20">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
                <CheckCircle2 className="mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">
                  No feedback items
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {`No ${filter.replace("_", " ")} items found.`}
                </p>
              </div>
            )}

            {!loading &&
              items.map((item, index) => {
                const displayStatus = toDisplayStatus(item.status);
                const meta = STATUS_META[displayStatus];
                const isSelected = selectedId === item.id;
                const isFocused = focusedIndex === index;

                return (
                  <ListItemContextMenu
                    key={item.id}
                    item={item}
                    onUpdateStatus={updateStatus}
                    onSendToGitHub={sendToGitHub}
                    onDelete={deleteItem}
                  >
                    <Button
                      type="button"
                      data-feedback-item
                      variant="ghost"
                      size="default"
                      onClick={() => selectItem(item.id)}
                      className={cn(
                        "group h-auto w-full items-start justify-start gap-3 rounded-none border-b border-border px-4 py-3 text-left transition-colors",
                        isSelected
                          ? "bg-primary/8 border-l-2 border-l-primary"
                          : "hover:bg-muted border-l-2 border-l-transparent",
                        isFocused && !isSelected && "bg-muted/60",
                      )}
                    >
                      {/* Status dot */}
                      <div
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          meta.dotClassName,
                        )}
                      />

                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-normal text-foreground">
                            {item.title}
                          </span>
                          {item.severity === "high" && (
                            <span className="shrink-0 text-[10px] font-semibold text-status-error">
                              HIGH
                            </span>
                          )}
                        </div>

                        {/* Meta row */}
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <button
                            type="button"
                            tabIndex={-1}
                            className="font-mono text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(item.id);
                              toast.success("ID copied");
                            }}
                            title={`Copy ID: ${item.id}`}
                          >
                            #{item.id.slice(0, 8)}
                          </button>
                          <span className="text-border">|</span>
                          {(() => {
                            const requestMeta =
                              REQUEST_TYPE_META[item.request_type];
                            return (
                              <span
                                className={cn(
                                  "text-[10px] font-normal",
                                  requestMeta?.className ?? "text-muted-foreground",
                                )}
                              >
                                {requestMeta?.shortLabel ??
                                  REQUEST_TYPE_LABELS[item.request_type] ??
                                  item.request_type}
                              </span>
                            );
                          })()}
                          <span className="text-border">|</span>
                          <span className="truncate font-mono text-[10px] font-normal text-muted-foreground">
                            {item.page_path}
                          </span>
                        </div>


                      </div>

                      {/* Timestamp */}
                      <span className="shrink-0 pt-0.5 text-[10px] text-muted-foreground">
                        {relativeTime(item.created_at)}
                      </span>
                    </Button>
                  </ListItemContextMenu>
                );
              })}
          </div>
        </div>

        {/* ---- Resize handle ---- */}
        <div
          className="hidden lg:flex items-center justify-center w-1.5 cursor-col-resize group hover:bg-muted/50 active:bg-muted transition-colors shrink-0"
          onMouseDown={handleMouseDown}
          aria-hidden="true"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
        </div>

        {/* ---- Right: detail panel (desktop) ---- */}
        <div className="hidden flex-1 overflow-y-auto lg:block">
          {!selected && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Select an item to view details
              </p>
            </div>
          )}

          {selected && (
            <FeedbackDetail
              item={selected}
              updatingId={updatingId}
              sendingToGitHub={sendingToGitHub}
              deletingId={deletingId}
              onUpdateStatus={updateStatus}
              onSendToGitHub={sendToGitHub}
              onDelete={deleteItem}
              commentInputRef={commentInputRef}
            />
          )}
        </div>

        {/* ---- Mobile: full-screen detail view ---- */}
        {mobileShowDetail && selected && (
          <div className="flex flex-1 flex-col overflow-y-auto lg:hidden">
            <FeedbackDetail
              item={selected}
              updatingId={updatingId}
              sendingToGitHub={sendingToGitHub}
              onUpdateStatus={updateStatus}
              onSendToGitHub={sendToGitHub}
              deletingId={deletingId}
              onDelete={deleteItem}
              onBack={handleMobileBack}
              commentInputRef={commentInputRef}
            />
          </div>
        )}
      </div>
      </div>
    </PageShell>
  );
}
