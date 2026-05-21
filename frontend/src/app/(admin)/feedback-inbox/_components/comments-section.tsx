"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { Image as ImageIcon, Loader2, Send, XCircle } from "lucide-react";
import { Button, Textarea } from "@/components/ds";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { appToast as toast } from "@/lib/toast/app-toast";

import type { FeedbackComment, UserProfile } from "../types";
import {
  displayName,
  extractMentionIds,
  getInitials,
  notifyFeedbackInboxFailure,
  relativeTime,
} from "../helpers";

function CommentInput({
  onSubmit,
  users,
  submitting,
  inputRef: externalInputRef,
}: {
  onSubmit: (
    body: string,
    mentions: string[],
    screenshotDataUrl: string | null,
  ) => void;
  users: UserProfile[];
  submitting: boolean;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const [value, setValue] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const localInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? localInputRef;

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
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
      const error =
        reader.error ??
        new Error("The browser could not read the selected image file.");
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
        u.full_name?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, mentionQuery]);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
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

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
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
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {getInitials(user)}
              </span>
              <span className="truncate text-xs font-medium text-foreground">
                {displayName(user)}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </Button>
          ))}
        </div>
      )}

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
        aria-label="Attach image"
        className="hidden"
        onChange={handleFileUpload}
      />
      <div className="rounded-md border border-border bg-background p-3 focus-within:ring-1 focus-within:ring-ring">
        <Textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment"
          rows={1}
          className="max-h-24 min-h-10 resize-none border-0 bg-transparent p-0 shadow-none"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 text-xs"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Attach image
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={handleSubmit}
            disabled={(!value.trim() && !screenshotDataUrl) || submitting}
            aria-label={submitting ? "Sending comment" : "Send comment"}
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CommentsSection({
  feedbackItemId,
  commentInputRef,
}: {
  feedbackItemId: string;
  commentInputRef?: RefObject<HTMLTextAreaElement | null>;
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

  async function handleSubmit(
    body: string,
    mentions: string[],
    screenshotDataUrl: string | null,
  ) {
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
        toast.success(
          `Comment added and ${mentions.length} user${mentions.length > 1 ? "s" : ""} notified`,
        );
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
    <div className="space-y-6">
      <SectionRuleHeading label="Comments" className="mb-0 pb-0" />

      <div ref={scrollRef} className="space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {getInitials(comment.author)}
            </span>
            <div className="min-w-0 flex-1 rounded-md bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {displayName(comment.author)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {relativeTime(comment.created_at)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
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

      <CommentInput
        onSubmit={handleSubmit}
        users={users}
        submitting={submitting}
        inputRef={commentInputRef}
      />
    </div>
  );
}
