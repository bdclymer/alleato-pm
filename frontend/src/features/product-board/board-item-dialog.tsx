"use client";

import { useState, useRef, useCallback, useEffect, useId } from "react";
import { formatDistanceToNow, isPast, differenceInDays } from "date-fns";
import {
  AlertTriangle, Zap, Minus, Link2, Plus, Send, X, Check,
  ArrowUpRight, ThumbsUp, Trash2, Tag, Calendar, UserCircle, ImageIcon, Paperclip, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  MorphingDialogTitle,
  MorphingDialogDescription,
  MorphingDialogClose,
} from "@/components/motion/morphing-dialog";
import { apiFetch } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { BOARD_STATUSES, BOARD_STATUS_LABELS, type BoardStatus } from "@/lib/admin-feedback/constants";
import {
  useBoardItemComments, useAddComment, useUpdateBoardItem, useDeleteBoardItem, useBoardUsers,
  type BoardItemMeta, type BoardItemLink, type BoardLabel,
} from "./use-board-item";
import type { BoardItem } from "./use-product-board";

// ── Constants ─────────────────────────────────────────────────────────────────

const SEVERITY_OPTIONS = [
  { value: "low" as const, label: "Low", icon: <Minus className="h-3.5 w-3.5" />, activeClass: "text-muted-foreground" },
  { value: "medium" as const, label: "Medium", icon: <Zap className="h-3.5 w-3.5" />, activeClass: "text-yellow-500" },
  { value: "high" as const, label: "High", icon: <AlertTriangle className="h-3.5 w-3.5" />, activeClass: "text-destructive" },
];

const STATUS_COLORS: Record<BoardStatus, string> = {
  submitted: "bg-muted text-muted-foreground",
  planned: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  shipped: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const LABEL_COLORS = [
  { color: "bg-red-500", defaultName: "Red" },
  { color: "bg-orange-400", defaultName: "Orange" },
  { color: "bg-yellow-400", defaultName: "Yellow" },
  { color: "bg-emerald-500", defaultName: "Green" },
  { color: "bg-blue-500", defaultName: "Blue" },
  { color: "bg-violet-500", defaultName: "Purple" },
  { color: "bg-pink-400", defaultName: "Pink" },
  { color: "bg-sky-400", defaultName: "Sky" },
];

// ── Small helpers ─────────────────────────────────────────────────────────────

function Avatar({ name, email, size = "md" }: { name: string | null; email: string; size?: "sm" | "md" }) {
  const initials = name ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : email[0].toUpperCase();
  return (
    <div className={cn(
      "flex flex-none items-center justify-center rounded-full bg-muted font-semibold text-foreground",
      size === "md" ? "h-7 w-7 text-[11px]" : "h-5 w-5 text-[9px]"
    )}>
      {initials}
    </div>
  );
}

function SidebarHeading({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>;
}

async function uploadBoardImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const { url } = await apiFetch<{ url: string }>("/api/admin/feedback/board/upload", {
    method: "POST",
    body: form,
  });
  return url;
}

// ── Main dialog ───────────────────────────────────────────────────────────────

interface BoardItemDialogProps {
  item: BoardItem;
}

export function BoardItemDialog({ item }: BoardItemDialogProps) {
  const { data: commentsData } = useBoardItemComments(item.id);
  const { data: usersData } = useBoardUsers();
  const addComment = useAddComment(item.id);
  const updateItem = useUpdateBoardItem(item.id);
  const deleteItem = useDeleteBoardItem();
  const uid = useId();
  const dateInputId = `${uid}-date`;

  // Current user ID for upvote persistence
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  // Editable state
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.comment);
  const [status, setStatus] = useState<BoardStatus>(item.board_status);
  const [severity, setSeverity] = useState(item.severity ?? "medium");
  const [assigneeId, setAssigneeId] = useState<string | null>(item.assignee_id);
  const [commentText, setCommentText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string>(item.screenshot_url ?? "");
  const [coverUploading, setCoverUploading] = useState(false);
  const [commentImageUrl, setCommentImageUrl] = useState<string | null>(null);
  const [commentImageUploading, setCommentImageUploading] = useState(false);
  const [descImageUploading, setDescImageUploading] = useState(false);

  const coverFileRef = useRef<HTMLInputElement>(null);
  const commentFileRef = useRef<HTMLInputElement>(null);
  const descFileRef = useRef<HTMLInputElement>(null);

  const meta = (item.metadata as BoardItemMeta | null) ?? {};
  const [links, setLinks] = useState<BoardItemLink[]>(meta.links ?? []);
  const [labels, setLabels] = useState<BoardLabel[]>(meta.labels ?? []);
  const [dueDate, setDueDate] = useState<string>(meta.due_date ?? "");
  const [upvotes, setUpvotes] = useState(meta.upvotes ?? 0);
  const [upvotedBy, setUpvotedBy] = useState<string[]>(meta.upvoted_by ?? []);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [editingLabelName, setEditingLabelName] = useState<string | null>(null);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");

  const hasUpvoted = currentUserId ? upvotedBy.includes(currentUserId) : false;

  const savedTitle = useRef(title);
  const savedDescription = useRef(description);
  const savedDueDate = useRef(dueDate);

  const save = useCallback(
    (patch: Parameters<typeof updateItem.mutate>[0]) => updateItem.mutate(patch),
    [updateItem]
  );

  function handleTitleBlur() {
    if (title !== savedTitle.current && title.trim()) {
      save({ title }); savedTitle.current = title;
    }
  }
  function handleDescriptionBlur() {
    if (description !== savedDescription.current) {
      save({ comment: description }); savedDescription.current = description;
    }
  }
  function handleDueDateBlur() {
    if (dueDate !== savedDueDate.current) {
      save({ metadata: { due_date: dueDate || null } }); savedDueDate.current = dueDate;
    }
  }
  function handleStatusChange(s: BoardStatus) { setStatus(s); save({ board_status: s }); }
  function handleSeverityChange(s: "low" | "medium" | "high") { setSeverity(s); save({ severity: s }); }
  function handleAssigneeChange(id: string | null) {
    setAssigneeId(id);
    setShowAssigneePicker(false);
    save({ assignee_id: id });
  }

  function toggleLabel(color: string) {
    const existing = labels.find((l) => l.color === color);
    const defaultName = LABEL_COLORS.find((c) => c.color === color)?.defaultName ?? color;
    const next = existing
      ? labels.filter((l) => l.color !== color)
      : [...labels, { id: crypto.randomUUID(), color, name: defaultName }];
    setLabels(next);
    save({ metadata: { labels: next } });
  }

  function updateLabelName(color: string, name: string) {
    const next = labels.map((l) => l.color === color ? { ...l, name } : l);
    setLabels(next);
    save({ metadata: { labels: next } });
  }

  function handleUpvote() {
    if (hasUpvoted || !currentUserId) return;
    const nextUpvotedBy = [...upvotedBy, currentUserId];
    const nextCount = upvotes + 1;
    setUpvotes(nextCount); setUpvotedBy(nextUpvotedBy);
    save({ metadata: { upvotes: nextCount, upvoted_by: nextUpvotedBy } });
  }

  function handleAddLink() {
    if (!newLinkUrl.trim()) return;
    const link: BoardItemLink = { id: crypto.randomUUID(), url: newLinkUrl.trim(), label: newLinkLabel.trim() || newLinkUrl.trim() };
    const next = [...links, link]; setLinks(next);
    save({ metadata: { links: next } });
    setNewLinkUrl(""); setNewLinkLabel(""); setShowLinkForm(false);
  }
  function handleRemoveLink(id: string) {
    const next = links.filter((l) => l.id !== id); setLinks(next);
    save({ metadata: { links: next } });
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const url = await uploadBoardImage(file);
      setCoverUrl(url);
      save({ screenshot_url: url });
    } catch {
      // silent — browser will show native error; file was rejected by server
    } finally {
      setCoverUploading(false);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  }

  async function handleCommentImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCommentImageUploading(true);
    try {
      const url = await uploadBoardImage(file);
      setCommentImageUrl(url);
    } catch {
      // silent
    } finally {
      setCommentImageUploading(false);
      if (commentFileRef.current) commentFileRef.current.value = "";
    }
  }

  async function handleDescImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDescImageUploading(true);
    try {
      const url = await uploadBoardImage(file);
      const insertion = `\n![image](${url})\n`;
      let next = "";
      setDescription((prev) => { next = prev + insertion; return next; });
      save({ comment: next });
      savedDescription.current = next;
    } catch {
      // silent
    } finally {
      setDescImageUploading(false);
      if (descFileRef.current) descFileRef.current.value = "";
    }
  }

  async function handleDescPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const file = Array.from(e.clipboardData.items)
      .find((item) => item.kind === "file" && item.type.startsWith("image/"))
      ?.getAsFile();
    if (!file) return;
    e.preventDefault();
    setDescImageUploading(true);
    try {
      const url = await uploadBoardImage(file);
      const insertion = `\n![image](${url})\n`;
      let next = "";
      setDescription((prev) => { next = prev + insertion; return next; });
      save({ comment: next });
      savedDescription.current = next;
    } catch {
      // silent
    } finally {
      setDescImageUploading(false);
    }
  }

  function handlePostComment() {
    if (!commentText.trim() && !commentImageUrl) return;
    addComment.mutate({ body: commentText.trim() || " ", screenshot_url: commentImageUrl });
    setCommentText("");
    setCommentImageUrl(null);
  }

  const dueDateDate = dueDate ? new Date(dueDate) : null;
  const dueDateOverdue = dueDateDate ? isPast(dueDateDate) : false;
  const dueDateSoon = dueDateDate && !dueDateOverdue ? differenceInDays(dueDateDate, new Date()) <= 2 : false;
  const comments = commentsData?.comments ?? [];
  const users = usersData?.users ?? [];
  const assignee = item.assignee ?? users.find((u) => u.id === assigneeId);

  return (
    <div className="flex flex-col" style={{ maxHeight: "88vh" }}>
      {/* Status strip */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border/50 px-6 py-2.5">
        {BOARD_STATUSES.map((s) => (
          <Button key={s} variant="ghost" size="sm" onClick={() => handleStatusChange(s)}
            className={cn("h-7 rounded-full px-3 text-xs font-medium", status === s ? STATUS_COLORS[s] : "text-muted-foreground hover:bg-muted")}
          >
            {BOARD_STATUS_LABELS[s]}
          </Button>
        ))}
        <MorphingDialogClose className="ml-auto text-muted-foreground hover:text-foreground" />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Left: title, description, comments ── */}
        <div className="flex flex-1 flex-col overflow-y-auto scrollbar-hide">

          {/* Cover image */}
          {coverUrl && (
            <div className="relative h-48 w-full flex-none overflow-hidden">
              <img src={coverUrl} alt="" className="h-full w-full object-cover" />
              <Button
                variant="ghost" size="sm"
                onClick={() => { setCoverUrl(""); save({ screenshot_url: null }); }}
                className="absolute right-2 top-2 h-7 gap-1 bg-background/80 text-xs backdrop-blur-sm hover:bg-background"
              >
                <X className="h-3.5 w-3.5" />
                Remove cover
              </Button>
            </div>
          )}

          <div className="px-6 py-5">
          {/* Label strips */}
          {labels.length > 0 && (
            <div className="mb-3 flex gap-1.5">
              {labels.map((l) => (
                <span key={l.id} title={l.name} className={cn("h-2.5 w-12 rounded-sm flex-shrink-0", l.color)} />
              ))}
            </div>
          )}

          {/* Title */}
          <MorphingDialogTitle>
            <Textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } }}
              rows={2}
              className="w-full resize-none border-0 bg-transparent px-0 text-xl font-semibold leading-snug text-foreground shadow-none outline-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
              placeholder="Card title"
            />
          </MorphingDialogTitle>

          {/* Description */}
          <MorphingDialogDescription className="mt-1">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              onPaste={handleDescPaste}
              rows={4}
              className="resize-none border-0 bg-transparent px-0 text-sm text-muted-foreground shadow-none outline-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
              placeholder="Add a description — context, goals, acceptance criteria, design links…"
            />
            <Input ref={descFileRef} type="file" accept="image/*" className="hidden" onChange={handleDescImageUpload} />
            <Button
              variant="ghost"
              size="sm"
              disabled={descImageUploading}
              onClick={() => descFileRef.current?.click()}
              className="mt-0.5 h-6 gap-1.5 px-1 text-xs text-muted-foreground/60 hover:text-muted-foreground"
            >
              {descImageUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
              {descImageUploading ? "Uploading…" : "Attach image"}
            </Button>
          </MorphingDialogDescription>

          {/* Activity */}
          <div className="mt-6 border-t border-border/50 pt-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Activity · {comments.length}
            </p>

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {comments.map((c) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3">
                    <Avatar name={c.user_profiles?.full_name ?? null} email={c.user_profiles?.email ?? "?"} />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {c.user_profiles?.full_name ?? c.user_profiles?.email ?? "User"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm leading-relaxed text-foreground/80">{c.body}</p>
                      {/* Screenshot attachment — bug fix: was never rendered */}
                      {c.screenshot_url && (
                        <img
                          src={c.screenshot_url}
                          alt="Attached screenshot"
                          className="mt-2 max-h-64 rounded-lg object-cover ring-1 ring-border"
                        />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {comments.length === 0 && <p className="text-sm text-muted-foreground/40">No activity yet.</p>}
            </div>

            {/* Comment input */}
            <div className="mt-5 space-y-2">
              <Textarea
                id={`${uid}-comment`}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePostComment(); }}
                placeholder="Write a comment… (⌘↵ to send)"
                rows={2}
                className="resize-none text-sm"
              />
              {/* Pending image preview */}
              {commentImageUrl && (
                <div className="relative inline-block">
                  <img src={commentImageUrl} alt="Attached" className="max-h-32 rounded-lg object-cover ring-1 ring-border" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCommentImageUrl(null)}
                    className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-background shadow-xs ring-1 ring-border hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Input ref={commentFileRef} type="file" accept="image/*" className="hidden" onChange={handleCommentImageUpload} />
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={commentImageUploading}
                  onClick={() => commentFileRef.current?.click()}
                  className="h-7 w-7 text-muted-foreground"
                  title="Attach image"
                >
                  {commentImageUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                </Button>
                <div className="flex-1" />
                <Button
                  size="sm"
                  disabled={(!commentText.trim() && !commentImageUrl) || addComment.isPending}
                  onClick={handlePostComment}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Post
                </Button>
              </div>
            </div>
          </div>
          </div>{/* end px-6 py-5 */}
        </div>{/* end left pane */}

        {/* ── Right sidebar ── */}
        <div className="w-52 flex-none overflow-y-auto border-l border-border/50 px-4 py-5 scrollbar-hide">

          {/* Cover image */}
          <div className="mb-5">
            <SidebarHeading>Cover</SidebarHeading>
            <Input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            <Button
              variant="ghost"
              size="sm"
              disabled={coverUploading}
              onClick={() => coverFileRef.current?.click()}
              className="h-8 w-full justify-start gap-2 text-xs text-muted-foreground"
            >
              {coverUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
              {coverUploading ? "Uploading…" : coverUrl ? "Change cover" : "Upload cover image"}
            </Button>
            {coverUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCoverUrl(""); save({ screenshot_url: null }); }}
                className="h-7 w-full justify-start gap-1 px-2 text-xs text-destructive hover:text-destructive"
              >
                <X className="h-3 w-3" />
                Remove cover
              </Button>
            )}
          </div>

          {/* Assignee */}
          <div className="mb-5">
            <SidebarHeading>Assignee</SidebarHeading>
            <Button
              variant="ghost" size="sm"
              onClick={() => setShowAssigneePicker((v) => !v)}
              className="h-8 w-full justify-start gap-2 text-xs text-muted-foreground"
            >
              {assignee ? (
                <>
                  <Avatar name={assignee.full_name ?? null} email={assignee.email} size="sm" />
                  <span className="truncate text-foreground">{assignee.full_name ?? assignee.email}</span>
                </>
              ) : (
                <>
                  <UserCircle className="h-4 w-4" />
                  Unassigned
                </>
              )}
            </Button>
            <AnimatePresence>
              {showAssigneePicker && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-1 overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                  <Button variant="ghost" size="sm" onClick={() => handleAssigneeChange(null)}
                    className="h-8 w-full justify-start gap-2 text-xs text-muted-foreground"
                  >
                    <UserCircle className="h-3.5 w-3.5" />
                    Unassigned
                  </Button>
                  {users.map((u) => (
                    <Button key={u.id} variant="ghost" size="sm" onClick={() => handleAssigneeChange(u.id)}
                      className={cn("h-8 w-full justify-start gap-2 text-xs", assigneeId === u.id && "bg-muted")}
                    >
                      <Avatar name={u.full_name ?? null} email={u.email} size="sm" />
                      <span className="truncate">{u.full_name ?? u.email}</span>
                      {assigneeId === u.id && <Check className="ml-auto h-3 w-3" />}
                    </Button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Labels */}
          <div className="mb-5">
            <SidebarHeading>Labels</SidebarHeading>
            <Button variant="ghost" size="sm" onClick={() => setShowLabelPicker((v) => !v)}
              className="h-8 w-full justify-start gap-2 text-xs text-muted-foreground"
            >
              <Tag className="h-3.5 w-3.5" />
              {showLabelPicker ? "Done" : labels.length > 0 ? `${labels.length} label${labels.length > 1 ? "s" : ""}` : "Add labels"}
            </Button>
            <AnimatePresence>
              {showLabelPicker && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 space-y-1.5 overflow-hidden">
                  {LABEL_COLORS.map(({ color, defaultName }) => {
                    const active = labels.find((l) => l.color === color);
                    return (
                      <div key={color} className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => toggleLabel(color)}
                          className={cn("relative h-6 w-6 flex-none rounded p-0", color, active && "ring-2 ring-foreground ring-offset-1")}
                        >
                          {active && <Check className="h-3 w-3 text-foreground drop-shadow" />}
                        </Button>
                        {active ? (
                          editingLabelName === color ? (
                            <Input
                              autoFocus
                              value={active.name}
                              onChange={(e) => updateLabelName(color, e.target.value)}
                              onBlur={() => setEditingLabelName(null)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingLabelName(null); }}
                              className="h-6 flex-1 text-xs"
                            />
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingLabelName(color)}
                              className="h-6 flex-1 justify-start truncate px-1 text-xs text-foreground hover:underline"
                            >
                              {active.name || defaultName}
                            </Button>
                          )
                        ) : (
                          <span className="flex-1 text-xs text-muted-foreground">{defaultName}</span>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Due date — bug fix: input now has the correct id */}
          <div className="mb-5">
            <SidebarHeading>Due date</SidebarHeading>
            <div className="space-y-1.5">
              <Input
                id={dateInputId}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={handleDueDateBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") { setDueDate(savedDueDate.current); e.currentTarget.blur(); }
                }}
                className="h-8 text-xs"
              />
              {dueDateDate && (
                <p className={cn("text-[11px]",
                  dueDateOverdue ? "text-destructive" : dueDateSoon ? "text-yellow-600" : "text-muted-foreground"
                )}>
                  {dueDateOverdue ? "Overdue" : dueDateSoon ? "Due soon" : "Upcoming"} · {formatDistanceToNow(dueDateDate, { addSuffix: true })}
                </p>
              )}
              {!dueDate && (
                <Button variant="ghost" size="sm" onClick={() => document.getElementById(dateInputId)?.focus()}
                  className="h-7 gap-1 px-1 text-xs text-muted-foreground"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Set date
                </Button>
              )}
            </div>
          </div>

          {/* Priority */}
          <div className="mb-5">
            <SidebarHeading>Priority</SidebarHeading>
            <div className="flex flex-col gap-0.5">
              {SEVERITY_OPTIONS.map((opt) => (
                <Button key={opt.value} variant="ghost" size="sm" onClick={() => handleSeverityChange(opt.value)}
                  className={cn("h-8 justify-start gap-2 text-xs font-medium", severity === opt.value ? "bg-muted " + opt.activeClass : "text-muted-foreground")}
                >
                  <span className={severity === opt.value ? opt.activeClass : ""}>{opt.icon}</span>
                  {opt.label}
                  {severity === opt.value && <Check className="ml-auto h-3 w-3" />}
                </Button>
              ))}
            </div>
          </div>

          {/* Upvotes — bug fix: persisted via upvoted_by array */}
          <div className="mb-5">
            <SidebarHeading>Support</SidebarHeading>
            <Button variant="ghost" size="sm" onClick={handleUpvote} disabled={hasUpvoted || !currentUserId}
              className={cn("h-8 w-full justify-start gap-2 text-xs font-medium", hasUpvoted ? "bg-muted text-primary" : "text-muted-foreground")}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {upvotes > 0 ? `${upvotes} upvote${upvotes === 1 ? "" : "s"}` : "Upvote"}
            </Button>
          </div>

          {/* Links */}
          <div className="mb-5">
            <SidebarHeading>Links</SidebarHeading>
            <div className="space-y-1.5">
              {links.map((link) => (
                <div key={link.id} className="group flex items-center gap-1.5">
                  <Link2 className="h-3 w-3 flex-none text-muted-foreground" />
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-xs text-primary hover:underline">
                    {link.label}
                  </a>
                  <ArrowUpRight className="h-3 w-3 flex-none text-muted-foreground/0 group-hover:text-muted-foreground" />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveLink(link.id)}
                    className="h-4 w-4 flex-none opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <AnimatePresence>
              {showLinkForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 space-y-1.5 overflow-hidden">
                  <Input placeholder="https://…" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="h-7 text-xs" autoFocus />
                  <Input placeholder="Label (optional)" value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} className="h-7 text-xs"
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddLink(); if (e.key === "Escape") setShowLinkForm(false); }}
                  />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 flex-1 text-xs" onClick={handleAddLink}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowLinkForm(false)}>Cancel</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {!showLinkForm && (
              <Button variant="ghost" size="sm" onClick={() => setShowLinkForm(true)} className="mt-1 h-7 gap-1 px-1 text-xs text-muted-foreground">
                <Plus className="h-3 w-3" />Add link
              </Button>
            )}
          </div>

          {/* Details */}
          <div className="mb-5 border-t border-border/50 pt-4">
            <SidebarHeading>Details</SidebarHeading>
            <div className="space-y-1 text-xs text-muted-foreground">
              {item.page_title && item.page_title !== "Product Board" && (
                <p><span className="font-medium text-foreground/70">From</span> {item.page_title}</p>
              )}
              <p><span className="font-medium text-foreground/70">Added</span> {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
            </div>
          </div>

          {/* Delete */}
          <div className="border-t border-border/50 pt-4">
            <SidebarHeading>Danger</SidebarHeading>
            {!confirmDelete ? (
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}
                className="h-8 w-full justify-start gap-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />Delete card
              </Button>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">Are you sure? This cannot be undone.</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="destructive" className="h-7 flex-1 text-xs" onClick={() => deleteItem.mutate(item.id)}>Delete</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
