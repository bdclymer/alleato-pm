"use client";

import { useState, useRef, useCallback, useId } from "react";
import { formatDistanceToNow, isPast, differenceInDays } from "date-fns";
import {
  AlertTriangle, Zap, Minus, Link2, Plus, Send, X, Check,
  ArrowUpRight, ThumbsUp, Trash2, Tag, Calendar,
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
import { BOARD_STATUSES, BOARD_STATUS_LABELS, type BoardStatus } from "@/lib/admin-feedback/constants";
import {
  useBoardItemComments, useAddComment, useUpdateBoardItem, useDeleteBoardItem,
  type BoardItemMeta, type BoardItemLink, type BoardLabel,
} from "./use-board-item";
import type { BoardItem } from "./use-product-board";

type BoardItemWithMeta = BoardItem & { metadata?: unknown };

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
  { color: "bg-red-500", label: "Red" },
  { color: "bg-orange-400", label: "Orange" },
  { color: "bg-yellow-400", label: "Yellow" },
  { color: "bg-emerald-500", label: "Green" },
  { color: "bg-blue-500", label: "Blue" },
  { color: "bg-violet-500", label: "Purple" },
  { color: "bg-pink-400", label: "Pink" },
  { color: "bg-sky-400", label: "Sky" },
];

// ── Small helpers ─────────────────────────────────────────────────────────────

function Avatar({ name, email }: { name: string | null; email: string }) {
  const initials = name ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : email[0].toUpperCase();
  return (
    <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
      {initials}
    </div>
  );
}

function SidebarHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

interface BoardItemDialogProps {
  item: BoardItemWithMeta;
}

export function BoardItemDialog({ item }: BoardItemDialogProps) {
  const { data: commentsData } = useBoardItemComments(item.id);
  const addComment = useAddComment(item.id);
  const updateItem = useUpdateBoardItem(item.id);
  const deleteItem = useDeleteBoardItem();
  const uid = useId();

  // Local editable state
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.comment);
  const [status, setStatus] = useState<BoardStatus>(item.board_status);
  const [severity, setSeverity] = useState(item.severity ?? "medium");
  const [commentText, setCommentText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const meta = (item.metadata as BoardItemMeta | null) ?? {};
  const [links, setLinks] = useState<BoardItemLink[]>(meta.links ?? []);
  const [labels, setLabels] = useState<BoardLabel[]>(meta.labels ?? []);
  const [dueDate, setDueDate] = useState<string>(meta.due_date ?? "");
  const [upvotes, setUpvotes] = useState(meta.upvotes ?? 0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");

  const savedTitle = useRef(title);
  const savedDescription = useRef(description);
  const savedDueDate = useRef(dueDate);

  const save = useCallback(
    (patch: Parameters<typeof updateItem.mutate>[0]) => updateItem.mutate(patch),
    [updateItem]
  );

  function handleTitleBlur() {
    if (title !== savedTitle.current && title.trim()) {
      save({ title });
      savedTitle.current = title;
    }
  }
  function handleDescriptionBlur() {
    if (description !== savedDescription.current) {
      save({ comment: description });
      savedDescription.current = description;
    }
  }
  function handleDueDateBlur() {
    if (dueDate !== savedDueDate.current) {
      save({ metadata: { due_date: dueDate || null } });
      savedDueDate.current = dueDate;
    }
  }
  function handleStatusChange(s: BoardStatus) { setStatus(s); save({ board_status: s }); }
  function handleSeverityChange(s: "low" | "medium" | "high") { setSeverity(s); save({ severity: s }); }

  function toggleLabel(color: string) {
    const exists = labels.find((l) => l.color === color);
    const next = exists
      ? labels.filter((l) => l.color !== color)
      : [...labels, { id: crypto.randomUUID(), color, text: color }];
    setLabels(next);
    save({ metadata: { labels: next } });
  }

  function handleUpvote() {
    if (hasUpvoted) return;
    const next = upvotes + 1;
    setUpvotes(next);
    setHasUpvoted(true);
    save({ metadata: { upvotes: next } });
  }

  function handleAddLink() {
    if (!newLinkUrl.trim()) return;
    const link: BoardItemLink = { id: crypto.randomUUID(), url: newLinkUrl.trim(), label: newLinkLabel.trim() || newLinkUrl.trim() };
    const next = [...links, link];
    setLinks(next);
    save({ metadata: { links: next } });
    setNewLinkUrl(""); setNewLinkLabel(""); setShowLinkForm(false);
  }
  function handleRemoveLink(id: string) {
    const next = links.filter((l) => l.id !== id);
    setLinks(next);
    save({ metadata: { links: next } });
  }

  function handlePostComment() {
    if (!commentText.trim()) return;
    addComment.mutate(commentText.trim());
    setCommentText("");
  }

  const dueDateDate = dueDate ? new Date(dueDate) : null;
  const dueDateOverdue = dueDateDate ? isPast(dueDateDate) : false;
  const dueDateSoon = dueDateDate && !dueDateOverdue ? differenceInDays(dueDateDate, new Date()) <= 2 : false;

  const comments = commentsData?.comments ?? [];

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
        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-5 scrollbar-hide">

          {/* Label color strips */}
          {labels.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {labels.map((l) => (
                <span key={l.id} className={cn("h-2.5 w-12 rounded-sm", l.color)} />
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
              rows={4}
              className="resize-none border-0 bg-transparent px-0 text-sm text-muted-foreground shadow-none outline-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
              placeholder="Add a description — context, goals, acceptance criteria, design links…"
            />
          </MorphingDialogDescription>

          {/* Comments */}
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
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground/40">No activity yet.</p>
              )}
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
              <div className="flex justify-end">
                <Button size="sm" disabled={!commentText.trim() || addComment.isPending} onClick={handlePostComment} className="gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-52 flex-none overflow-y-auto border-l border-border/50 px-4 py-5 scrollbar-hide">

          {/* Labels */}
          <div className="mb-5">
            <SidebarHeading>Labels</SidebarHeading>
            <Button variant="ghost" size="sm" onClick={() => setShowLabelPicker((v) => !v)}
              className="h-8 w-full justify-start gap-2 text-xs text-muted-foreground"
            >
              <Tag className="h-3.5 w-3.5" />
              {showLabelPicker ? "Done" : "Edit labels"}
            </Button>
            <AnimatePresence>
              {showLabelPicker && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 grid grid-cols-4 gap-1.5 overflow-hidden">
                  {LABEL_COLORS.map(({ color, label: lbl }) => {
                    const active = labels.some((l) => l.color === color);
                    return (
                      <Button
                        key={color}
                        title={lbl}
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleLabel(color)}
                        className={cn("relative h-6 w-full rounded p-0 transition-transform hover:scale-110", color, active && "ring-2 ring-foreground ring-offset-1")}
                      >
                        {active && <Check className="absolute inset-0 m-auto h-3 w-3 text-foreground drop-shadow" />}
                      </Button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Due date */}
          <div className="mb-5">
            <SidebarHeading>Due date</SidebarHeading>
            <div className="space-y-1.5">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={handleDueDateBlur}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setDueDate(savedDueDate.current); e.currentTarget.blur(); } }}
                className="h-8 text-xs"
              />
              {dueDateDate && (
                <p className={cn("text-[11px]", dueDateOverdue ? "text-destructive" : dueDateSoon ? "text-yellow-600" : "text-muted-foreground")}>
                  {dueDateOverdue ? "Overdue" : dueDateSoon ? "Due soon" : "Upcoming"} · {formatDistanceToNow(dueDateDate, { addSuffix: true })}
                </p>
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

          {/* Upvotes */}
          <div className="mb-5">
            <SidebarHeading>Support</SidebarHeading>
            <Button variant="ghost" size="sm" onClick={handleUpvote} disabled={hasUpvoted}
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
                    className="h-4 w-4 flex-none opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive" aria-label="Remove link"
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
                <Plus className="h-3 w-3" />
                Add link
              </Button>
            )}
          </div>

          {/* Details */}
          <div className="mb-5 border-t border-border/50 pt-4">
            <SidebarHeading>Details</SidebarHeading>
            <div className="space-y-1 text-xs text-muted-foreground">
              {item.page_title && <p><span className="font-medium text-foreground/70">From</span> {item.page_title}</p>}
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
                <Trash2 className="h-3.5 w-3.5" />
                Delete card
              </Button>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">Are you sure? This cannot be undone.</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="destructive" className="h-7 flex-1 text-xs" onClick={() => deleteItem.mutate(item.id)}>
                    Delete
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Calendar icon placeholder for due date visual */}
          {!dueDate && (
            <Button variant="ghost" size="sm" onClick={() => document.getElementById(`${uid}-date`)?.focus?.()}
              className="mt-3 h-8 w-full justify-start gap-2 text-xs text-muted-foreground"
            >
              <Calendar className="h-3.5 w-3.5" />
              Set due date
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
