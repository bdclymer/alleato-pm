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
  Circle,
  Clock,
  ExternalLink,
  GitBranch,
  MessageSquare,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  created_at: string;
  updated_at: string;
  author: UserProfile;
};

type StatusFilter = "open" | "submitted" | "closed" | "all";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "submitted", label: "Submitted" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

const STATUS_META: Record<string, { icon: typeof Circle; className: string; dotClassName: string; label: string }> = {
  open: {
    icon: Circle,
    className: "text-amber-600 dark:text-amber-400",
    dotClassName: "bg-amber-500",
    label: "Open",
  },
  submitted: {
    icon: ArrowUpRight,
    className: "text-blue-600 dark:text-blue-400",
    dotClassName: "bg-blue-500",
    label: "Submitted",
  },
  github_failed: {
    icon: XCircle,
    className: "text-red-600 dark:text-red-400",
    dotClassName: "bg-red-500",
    label: "GitHub failed",
  },
  closed: {
    icon: CheckCircle2,
    className: "text-green-600 dark:text-green-400",
    dotClassName: "bg-green-500",
    label: "Closed",
  },
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  change_request: "Change request",
  copy: "Copy",
  question: "Question",
};

const SEVERITY_COLORS: Record<string, string> = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-muted-foreground",
};

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
    // Match @firstName, @fullName, or @email prefix (case insensitive)
    const name = displayName(user).toLowerCase();
    const pattern = new RegExp(`@${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(text)) {
      ids.push(user.id);
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Comment Input with @mention autocomplete
// ---------------------------------------------------------------------------

function CommentInput({
  onSubmit,
  users,
  submitting,
}: {
  onSubmit: (body: string, mentions: string[]) => void;
  users: UserProfile[];
  submitting: boolean;
}) {
  const [value, setValue] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

    // Check if user is typing @mention
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

    // Refocus after state update
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
    if (!trimmed || submitting) return;
    const mentions = extractMentionIds(trimmed, users);
    onSubmit(trimmed, mentions);
    setValue("");
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
                e.preventDefault(); // prevent blur
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

      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment... Use @ to mention someone"
          rows={2}
          className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!value.trim() || submitting}
          className="h-8 w-8 p-0 shrink-0"
          aria-label="Send comment"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Press <kbd className="rounded border border-border px-1 py-0.5 text-[9px]">Cmd+Enter</kbd> to send
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comments Section
// ---------------------------------------------------------------------------

function CommentsSection({ feedbackItemId }: { feedbackItemId: string }) {
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
      // silent — comments are secondary
    } finally {
      setLoading(false);
    }
  }, [feedbackItemId]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) return;
      const data = await res.json();
      // Handle various response shapes
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

  async function handleSubmit(body: string, mentions: string[]) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/feedback/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackItemId,
          body,
          mentions,
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
    // Match @Name patterns and highlight them
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
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
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
            </div>
          </div>
        ))}
      </div>

      {/* Comment input */}
      <CommentInput
        onSubmit={handleSubmit}
        users={users}
        submitting={submitting}
      />
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
  onUpdateStatus,
  onSendToGitHub,
  onBack,
}: {
  item: FeedbackItem;
  updatingId: string | null;
  sendingToGitHub: boolean;
  onUpdateStatus: (id: string, status: string) => void;
  onSendToGitHub: (id: string) => void;
  onBack?: () => void;
}) {
  return (
    <div className="space-y-6 px-6 py-6 lg:px-12 lg:py-8">
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

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            {item.title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {item.github_issue_url && (
              <a
                href={item.github_issue_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                #{item.github_issue_number}
              </a>
            )}
          </div>
        </div>

        {/* Meta badges */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-[11px]",
              STATUS_META[item.status]?.className,
            )}
          >
            {STATUS_META[item.status]?.label ?? item.status}
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            {REQUEST_TYPE_LABELS[item.request_type] ?? item.request_type}
          </Badge>
          {item.severity && (
            <span
              className={cn(
                "text-[11px] font-medium",
                SEVERITY_COLORS[item.severity],
              )}
            >
              {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)} severity
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            <Clock className="mr-1 inline h-3 w-3" />
            {new Date(item.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Description
        </p>
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {item.comment}
          </p>
        </div>
      </div>

      {/* Screenshot */}
      {item.screenshot_url && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Screenshot
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.screenshot_url}
              alt="Feedback screenshot"
              className="w-full max-h-75 object-cover object-top"
            />
          </div>
        </div>
      )}

      {/* Location */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Location
        </p>
        <div className="space-y-1.5">
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
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border pt-4">
        {/* Send to Claude Code — only if no issue exists yet */}
        {!item.github_issue_number && (
          <Button
            size="sm"
            onClick={() => onSendToGitHub(item.id)}
            disabled={sendingToGitHub}
          >
            <GitBranch className="mr-2 h-3.5 w-3.5" />
            {sendingToGitHub ? "Sending..." : "Send to Claude Code"}
          </Button>
        )}

        {/* View Issue in GitHub — when issue already exists */}
        {item.github_issue_url && (
          <Button
            size="sm"
            variant="outline"
            asChild
          >
            <a
              href={item.github_issue_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              View Issue in GitHub
            </a>
          </Button>
        )}

        {(item.status === "open" || item.status === "github_failed" || item.status === "submitted") && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateStatus(item.id, "closed")}
            disabled={updatingId === item.id}
          >
            {updatingId === item.id ? "Updating..." : "Close"}
          </Button>
        )}
        {item.status === "closed" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateStatus(item.id, "open")}
            disabled={updatingId === item.id}
          >
            {updatingId === item.id ? "Updating..." : "Re-open"}
          </Button>
        )}
      </div>

      {/* Comments */}
      <div className="border-t border-border pt-6">
        <CommentsSection feedbackItemId={item.id} />
      </div>
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
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

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
        params.set(
          "status",
          filter === "open" ? "open,github_failed" : filter,
        );
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

  // Auto-select the most recent item when items load
  useEffect(() => {
    if (!loading && items.length > 0 && !selectedId) {
      setSelectedId(items[0].id);
    }
  }, [loading, items, selectedId]);

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
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ---- Left: list panel ---- */}
        <div
          className={cn(
            "flex w-full flex-col border-r border-border lg:w-120 lg:max-w-lg",
            mobileShowDetail ? "hidden lg:flex" : "flex",
          )}
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
              items.map((item) => {
                const meta = STATUS_META[item.status] ?? STATUS_META.open;
                const isSelected = selectedId === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectItem(item.id)}
                    className={cn(
                      "group flex w-full cursor-pointer items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors",
                      isSelected
                        ? "bg-muted/60"
                        : "hover:bg-muted/30",
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

                      {/* Comment preview */}
                      {item.comment && (
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
                );
              })}
          </div>
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
              onUpdateStatus={updateStatus}
              onSendToGitHub={sendToGitHub}
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
              onBack={handleMobileBack}
            />
          </div>
        )}
      </div>
    </div>
  );
}
