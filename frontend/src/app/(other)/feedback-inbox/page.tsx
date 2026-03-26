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
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Copy,
  ExternalLink,
  GitBranch,
  Github,
  GripVertical,
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

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ds/status-badge";

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

type StatusFilter = "open" | "submitted" | "in_progress" | "resolved" | "closed" | "all";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "submitted", label: "Submitted" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "submitted", label: "Submitted" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const STATUS_META: Record<string, { icon: typeof Circle; className: string; dotClassName: string; label: string; showInList?: boolean }> = {
  open: {
    icon: Circle,
    className: "text-amber-600 dark:text-amber-400",
    dotClassName: "bg-amber-500",
    label: "Open",
  },
  in_progress: {
    icon: Loader2,
    className: "text-purple-600 dark:text-purple-400",
    dotClassName: "bg-purple-500 animate-pulse",
    label: "In Progress",
    showInList: true,
  },
  submitted: {
    icon: ArrowUpRight,
    className: "text-blue-600 dark:text-blue-400",
    dotClassName: "bg-blue-500",
    label: "Submitted",
    showInList: true,
  },
  github_failed: {
    icon: XCircle,
    className: "text-red-600 dark:text-red-400",
    dotClassName: "bg-red-500",
    label: "GitHub failed",
  },
  resolved: {
    icon: ShieldCheck,
    className: "text-green-600 dark:text-green-400",
    dotClassName: "bg-green-500",
    label: "Resolved",
    showInList: true,
  },
  closed: {
    icon: CheckCircle2,
    className: "text-muted-foreground",
    dotClassName: "bg-muted-foreground",
    label: "Closed",
  },
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  change_request: "Change request",
  copy: "Copy",
  question: "Question",
};


const PANEL_MIN_WIDTH = 280;
const PANEL_MAX_WIDTH = 600;
const PANEL_DEFAULT_WIDTH = 480;
const PANEL_STORAGE_KEY = "feedback-inbox-panel-width";

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
function renderSimpleMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  for (let li = 0; li < lines.length; li++) {
    if (li > 0) nodes.push(<br key={`br-${li}`} />);

    const line = lines[li];
    // Split by markdown patterns
    const parts = line.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/g);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      if (part.startsWith("**") && part.endsWith("**")) {
        nodes.push(<strong key={`${li}-${i}`}>{part.slice(2, -2)}</strong>);
      } else if (part.startsWith("_") && part.endsWith("_")) {
        nodes.push(<em key={`${li}-${i}`}>{part.slice(1, -1)}</em>);
      } else if (part.startsWith("`") && part.endsWith("`")) {
        nodes.push(
          <code key={`${li}-${i}`} className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">
            {part.slice(1, -1)}
          </code>,
        );
      } else if (part.startsWith("[")) {
        // Link — the regex captures the text and url in subsequent groups
        const linkText = parts[i + 1];
        const linkUrl = parts[i + 2];
        if (linkText && linkUrl) {
          nodes.push(
            <a
              key={`${li}-${i}`}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              {linkText}
            </a>,
          );
          i += 2; // skip the captured groups
        }
      } else {
        nodes.push(part);
      }
    }
  }

  return nodes;
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
            <button
              key={user.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
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
            </button>
          ))}
        </div>
      )}

      {/* Screenshot preview */}
      {screenshotDataUrl && (
        <div className="mb-2 relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshotDataUrl}
            alt="Comment screenshot"
            className="h-24 max-w-48 rounded-lg border border-border object-cover"
          />
          <button
            type="button"
            onClick={() => setScreenshotDataUrl(null)}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
            aria-label="Remove screenshot"
          >
            <XCircle className="h-3 w-3" />
          </button>
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Attach image
          </button>
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
      const res = await fetch(
        `/api/admin/feedback/comments?feedbackItemId=${feedbackItemId}`,
      );
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [feedbackItemId]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) return;
      const data = await res.json();
      const userList = Array.isArray(data) ? data : data.users ?? data.data ?? [];
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
      const res = await fetch("/api/admin/feedback/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackItemId,
          body,
          mentions,
          screenshotDataUrl,
        }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
      scrollToBottom();
      if (mentions.length > 0) {
        toast.success(`Comment added and ${mentions.length} user${mentions.length > 1 ? "s" : ""} notified`);
      }
    } catch {
      toast.error("Failed to add comment");
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
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
      const res = await fetch(
        `/api/admin/feedback/github-comments?issueNumber=${issueNumber}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
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
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-medium text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700">
                    Claude Code
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {relativeTime(comment.created_at)}
                </span>
              </div>
              <div className="mt-0.5 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
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
  onUpdateStatus: (id: string, status: string) => void;
  onSendToGitHub: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const isClosable = item.status === "open" || item.status === "github_failed" || item.status === "submitted" || item.status === "in_progress";
  const isResolvable = item.status !== "resolved" && item.status !== "closed";

  function handleAction(action: string) {
    setContextPos(null);
    switch (action) {
      case "resolve":
        onUpdateStatus(item.id, "resolved");
        break;
      case "close":
        onUpdateStatus(item.id, "closed");
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
      case "delete":
        if (window.confirm("Delete this feedback item? This cannot be undone.")) {
          onDelete(item.id);
        }
        break;
    }
  }

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div onContextMenu={handleContextMenu} className="contents">
        {children}
      </div>

      {contextPos && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-40 rounded-md border border-border bg-popover p-1 shadow-sm animate-in fade-in-0 zoom-in-95"
          style={{ top: contextPos.y, left: contextPos.x }}
        >
          {isResolvable && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              onClick={() => handleAction("resolve")}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Resolve
            </button>
          )}

          {isClosable ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              onClick={() => handleAction("close")}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Close
            </button>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              onClick={() => handleAction("reopen")}
            >
              <Circle className="h-3.5 w-3.5" />
              Re-open
            </button>
          )}

          <div className="my-1 h-px bg-border" />

          {!item.github_issue_number && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              onClick={() => handleAction("send_to_github")}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Create Issue
            </button>
          )}

          {item.github_issue_url && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              onClick={() => handleAction("view_github")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View in GitHub
            </button>
          )}

          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
            onClick={() => handleAction("copy_link")}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy link
          </button>

          <div className="my-1 h-px bg-border" />

          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => handleAction("delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
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
        const [toolsRes, matchRes] = await Promise.all([
          fetch("/api/admin/feedback/tools?action=list"),
          fetch(`/api/admin/feedback/tools?action=match&feedbackId=${item.id}`),
        ]);

        if (cancelled) return;

        if (toolsRes.ok) {
          const data = await toolsRes.json();
          setTools(data.tools ?? []);
        }

        if (matchRes.ok) {
          const data = await matchRes.json();
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
      const res = await fetch("/api/admin/feedback/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId: item.id, toolId }),
      });
      if (res.ok) {
        setAssignedToolId(toolId);
        // Fetch resolved context
        const ctxRes = await fetch(`/api/admin/feedback/tools?action=resolve&toolId=${toolId}`);
        if (ctxRes.ok) {
          const data = await ctxRes.json();
          setContext(data.context ?? null);
        }
        toast.success("Tool assigned");
      }
    } catch {
      toast.error("Failed to assign tool");
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoMatch() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feedback/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId: item.id, toolId: null, auto: true }),
      });
      if (res.ok) {
        const data = await res.json();
        const newToolId = data.item?.tool_id;
        setAssignedToolId(newToolId ?? null);
        if (newToolId) {
          const ctxRes = await fetch(`/api/admin/feedback/tools?action=resolve&toolId=${newToolId}`);
          if (ctxRes.ok) {
            const ctxData = await ctxRes.json();
            setContext(ctxData.context ?? null);
          }
          toast.success("Tool auto-matched");
        } else {
          setContext(null);
          toast("No matching tool found", { description: "Assign one manually." });
        }
      }
    } catch {
      toast.error("Auto-match failed");
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
      const res = await fetch("/api/admin/feedback/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) {
        toast.success("Procore crawl complete", { description: `Manifest saved for ${slug}` });
      } else {
        const data = await res.json().catch(() => null);
        toast.error("Crawl failed", { description: data?.hint ?? data?.error ?? "Unknown error" });
      }
    } catch {
      toast.error("Crawl request failed");
    } finally {
      setCrawling(false);
    }
  }

  const assignedTool = tools.find((t) => t.id === assignedToolId);

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
        Tool Context
      </p>

      {/* Tool assignment */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Wrench className="h-3 w-3 text-muted-foreground" />
            {assignedTool ? assignedTool.name : "Assign tool"}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {showDropdown && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-56 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleAssign(tool.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-muted",
                    tool.id === assignedToolId && "bg-primary/10 text-primary",
                  )}
                >
                  <span className="truncate">{tool.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{tool.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleAutoMatch}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          title="Auto-detect tool from feedback content"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          Auto-match
        </button>
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
            <button
              type="button"
              onClick={handleCrawl}
              disabled={crawling}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {crawling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              {crawling ? "Crawling Procore..." : "Crawl Procore"}
            </button>
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
  onUpdateStatus: (id: string, status: string) => void;
  onSendToGitHub: (id: string) => void;
  onDelete: (id: string) => void;
  onBack?: () => void;
  commentInputRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-6 lg:px-10 lg:py-8">
      {/* Mobile back button */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-2 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      )}

      {/* Header + Actions */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground">
              {item.title}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>
                {REQUEST_TYPE_LABELS[item.request_type] ?? item.request_type}
              </span>
              {item.severity && (
                <>
                  <span className="text-border">·</span>
                  <span className={cn(
                    "font-medium",
                    item.severity === "high" && "text-red-600 dark:text-red-400",
                    item.severity === "medium" && "text-amber-600 dark:text-amber-400",
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
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 shrink-0"
            onClick={() => {
              if (window.confirm("Delete this feedback item? This cannot be undone.")) {
                onDelete(item.id);
              }
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
              value={item.status}
              onChange={(e) => onUpdateStatus(item.id, e.target.value)}
              disabled={updatingId === item.id}
              className={cn(
                "h-7 appearance-none rounded-md pl-2 pr-7 text-xs font-medium border-0 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
                item.status === "resolved" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                item.status === "closed" && "bg-muted text-muted-foreground",
                item.status === "open" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                item.status === "submitted" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                item.status === "in_progress" && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
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
              <Github className="h-3 w-3" />
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.screenshot_url}
              alt="Feedback screenshot"
              className="w-full max-h-75 object-cover object-top"
            />
          </div>
        )}
      </div>

      {/* Details (Location + Tool Context) */}
      <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-3">
        {/* Location rows */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-16 shrink-0">Page</span>
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
              <span className="text-muted-foreground w-16 shrink-0">Title</span>
              <span className="text-foreground">{item.page_title}</span>
            </div>
          )}
          {item.target_text && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-16 shrink-0">Element</span>
              <span className="truncate text-foreground">{item.target_text}</span>
            </div>
          )}
          {item.target_selector && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-16 shrink-0">Selector</span>
              <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                {item.target_selector}
              </code>
            </div>
          )}
          {item.project_id && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-16 shrink-0">Project</span>
              <span className="text-foreground">#{item.project_id}</span>
            </div>
          )}
        </div>

        {/* Tool Context inline */}
        <ToolContextSection item={item} />
      </div>

      {/* Comments */}
      <CommentsSection feedbackItemId={item.id} commentInputRef={commentInputRef} />

      {/* GitHub Activity */}
      {item.github_issue_number && (
        <GitHubActivitySection issueNumber={item.github_issue_number} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function FeedbackInboxPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("open");
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
        } else {
          params.set("status", filter);
        }
      }
      const res = await fetch(`/api/admin/feedback?${params.toString()}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load feedback items");
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
  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(`Marked as ${status}`);
      fetchItems();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  // ---- Send to GitHub ----
  async function sendToGitHub(id: string) {
    setSendingToGitHub(true);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create GitHub issue");
      }
      const data = await res.json();
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
      const res = await fetch("/api/admin/feedback", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Feedback item deleted");
      if (selectedId === id) {
        setSelectedId(null);
        setMobileShowDetail(false);
      }
      fetchItems();
    } catch {
      toast.error("Failed to delete feedback item");
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
    <div className="flex h-full min-h-0 flex-col">
      {/* ---- Top bar ---- */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold text-foreground">Feedback</h1>
          {total > 0 && (
            <span className="text-xs text-muted-foreground">{total}</span>
          )}
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <p className="text-[10px] text-muted-foreground">
            <kbd className="rounded border border-border px-1 py-0.5 text-[9px]">&uarr;&darr;</kbd> navigate
            <span className="mx-1.5 text-border">|</span>
            <kbd className="rounded border border-border px-1 py-0.5 text-[9px]">c</kbd> comment
            <span className="mx-1.5 text-border">|</span>
            <kbd className="rounded border border-border px-1 py-0.5 text-[9px]">g</kbd> github
          </p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ---- Left: list panel ---- */}
        {/* eslint-disable-next-line react/forbid-dom-props */}
        <div
          ref={listPanelRef}
          className={cn(
            "flex flex-col border-r border-border",
            mobileShowDetail ? "hidden lg:flex" : "flex",
            "w-full lg:w-auto lg:shrink-0",
          )}
          style={{ maxWidth: panelWidth, minWidth: PANEL_MIN_WIDTH }}
        >
          {/* Filter tabs */}
          <div className="flex items-center gap-1 border-b border-border px-4 py-2">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  setFilter(f.value);
                  setSelectedId(null);
                  setMobileShowDetail(false);
                }}
                className={cn(
                  "h-7 px-2.5 text-xs",
                  filter !== f.value && "text-muted-foreground",
                )}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">
                  No feedback items
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {filter === "open"
                    ? "All clear! No open items."
                    : `No ${filter} items found.`}
                </p>
              </div>
            )}

            {!loading &&
              items.map((item, index) => {
                const meta = STATUS_META[item.status] ?? STATUS_META.open;
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
                    <button
                      type="button"
                      data-feedback-item
                      onClick={() => selectItem(item.id)}
                      className={cn(
                        "group flex w-full cursor-pointer items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors",
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
                          <span className="truncate text-sm font-medium text-foreground">
                            {item.title}
                          </span>
                          {item.severity === "high" && (
                            <span className="shrink-0 text-[10px] font-semibold text-red-600 dark:text-red-400">
                              HIGH
                            </span>
                          )}
                        </div>

                        {/* Meta row */}
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {REQUEST_TYPE_LABELS[item.request_type] ?? item.request_type}
                          </span>
                          <span className="text-border">|</span>
                          <span className="truncate font-mono text-[11px]">
                            {item.page_path}
                          </span>
                        </div>

                        {/* Status text for in_progress and submitted */}
                        {meta.showInList && (
                          <div className={cn("mt-0.5 flex items-center gap-1.5 text-[10px] font-medium", meta.className)}>
                            {item.status === "in_progress" && (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            )}
                            {item.status === "submitted" && (
                              <ArrowUpRight className="h-2.5 w-2.5" />
                            )}
                            {item.status === "resolved" && (
                              <ShieldCheck className="h-2.5 w-2.5" />
                            )}
                            {meta.label}
                          </div>
                        )}

                        {/* Comment preview */}
                        {item.comment && !meta.showInList && (
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {item.comment}
                          </p>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="shrink-0 pt-0.5 text-[10px] text-muted-foreground">
                        {relativeTime(item.created_at)}
                      </span>
                    </button>
                  </ListItemContextMenu>
                );
              })}
          </div>
        </div>

        {/* ---- Resize handle ---- */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
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
  );
}
