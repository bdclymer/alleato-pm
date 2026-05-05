"use client";

import { useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BoardCard } from "./board-card";
import { useCreateBoardItem } from "./use-board-item";
import type { BoardItem } from "./use-product-board";
import type { BoardStatus } from "@/lib/admin-feedback/constants";

const COLUMN_BG: Record<BoardStatus, string> = {
  submitted: "bg-muted/50",
  in_review: "bg-blue-50/60 dark:bg-blue-950/20",
  planned: "bg-violet-50/60 dark:bg-violet-950/20",
  in_progress: "bg-amber-50/60 dark:bg-amber-950/20",
  shipped: "bg-emerald-50/60 dark:bg-emerald-950/20",
};

const COUNT_PILL: Record<BoardStatus, string> = {
  submitted: "bg-muted text-muted-foreground",
  in_review: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  planned: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  shipped: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

// ── Inline card creator ───────────────────────────────────────────────────────

function InlineCardCreator({ status, onDone }: { status: BoardStatus; onDone?: () => void }) {
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const create = useCreateBoardItem();

  function open() {
    setAdding(true);
    // Let React render the textarea before focusing
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function close() {
    setTitle("");
    setAdding(false);
    onDone?.();
  }

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed) { close(); return; }
    create.mutate({ title: trimmed, board_status: status });
    setTitle(""); // stay open for next card (Trello behaviour)
    textareaRef.current?.focus();
  }

  if (!adding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={open}
        className="mt-1 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Add a card
      </Button>
    );
  }

  return (
    <div className="mt-1 space-y-1.5">
      <Textarea
        ref={textareaRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          if (e.key === "Escape") close();
        }}
        placeholder="Enter a title for this card…"
        rows={3}
        className="resize-none text-sm"
      />
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          disabled={!title.trim() || create.isPending}
          onClick={submit}
          className="h-8"
        >
          Add card
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={close}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

interface BoardColumnProps {
  status: BoardStatus;
  label: string;
  items: BoardItem[];
  readonly?: boolean;
}

export function BoardColumn({ status, label, items, readonly }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 flex-none flex-col gap-0">
      {/* Column header */}
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", COUNT_PILL[status])}>
          {items.length}
        </span>
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-16 flex-col gap-2 rounded-2xl p-2 transition-colors duration-150",
          COLUMN_BG[status],
          isOver && "ring-2 ring-primary/40 ring-offset-1"
        )}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <BoardCard key={item.id} item={item} readonly={readonly} />
          ))}
        </SortableContext>

        {!readonly && <InlineCardCreator status={status} />}

        {items.length === 0 && readonly && (
          <div className="flex flex-1 items-center justify-center py-6">
            <p className="text-xs text-muted-foreground/40">No cards</p>
          </div>
        )}
      </div>
    </div>
  );
}
