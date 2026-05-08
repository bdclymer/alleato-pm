"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, BookOpen, ExternalLink, Minus, MessageSquare, Zap } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { Modal, ModalContent } from "@/components/ui/unified-modal";
import { cn } from "@/lib/utils";
import { BOARD_STATUS_LABELS, type BoardStatus } from "@/lib/admin-feedback/constants";
import type { BoardItem } from "./use-product-board";
import type { BoardItemMeta } from "./use-board-item";
import { BoardItemDialog } from "./board-item-dialog";

const STATUS_COLORS: Record<BoardStatus, string> = {
  submitted: "bg-muted text-muted-foreground",
  planned: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  shipped: "bg-status-success/10 text-status-success",
};

const SEVERITY_ICONS = {
  high: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
  medium: <Zap className="h-3.5 w-3.5 text-yellow-500" />,
  low: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
};

function AssigneeAvatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : email[0].toUpperCase();
  return (
    <div
      className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground"
      title={name ?? email}
    >
      {initials}
    </div>
  );
}

interface BoardTableViewProps {
  items: BoardItem[];
}

type SortKey = "title" | "board_status" | "severity" | "created_at";
type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<BoardStatus, number> = {
  submitted: 0,
  planned: 1,
  in_progress: 2,
  shipped: 3,
};

const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function BoardTableView({ items }: BoardTableViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("board_status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const selectedItem = items.find((i) => i.id === selectedId);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = [...items].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "title") cmp = a.title.localeCompare(b.title);
    else if (sortKey === "board_status") cmp = STATUS_ORDER[a.board_status] - STATUS_ORDER[b.board_status];
    else if (sortKey === "severity") cmp = (SEVERITY_ORDER[a.severity ?? "low"] ?? 2) - (SEVERITY_ORDER[b.severity ?? "low"] ?? 2);
    else if (sortKey === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortDir === "asc" ? cmp : -cmp;
  });

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-muted-foreground/30">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th
                className="cursor-pointer py-2.5 pl-3 pr-4 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => toggleSort("title")}
              >
                Title <SortIndicator col="title" />
              </th>
              <th
                className="cursor-pointer py-2.5 px-4 text-left text-xs font-medium text-muted-foreground hover:text-foreground whitespace-nowrap"
                onClick={() => toggleSort("board_status")}
              >
                Status <SortIndicator col="board_status" />
              </th>
              <th
                className="cursor-pointer py-2.5 px-4 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => toggleSort("severity")}
              >
                Priority <SortIndicator col="severity" />
              </th>
              <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground">
                Assignee
              </th>
              <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                Due date
              </th>
              <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground">
                Docs
              </th>
              <th className="py-2.5 px-4 text-center text-xs font-medium text-muted-foreground">
                <MessageSquare className="inline h-3.5 w-3.5" />
              </th>
              <th
                className="cursor-pointer py-2.5 px-4 text-left text-xs font-medium text-muted-foreground hover:text-foreground whitespace-nowrap"
                onClick={() => toggleSort("created_at")}
              >
                Created <SortIndicator col="created_at" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const meta = (item.metadata as BoardItemMeta | null) ?? {};
              const docsUrl = meta.docs_url;
              const dueDate = meta.due_date;
              const primaryLink = (meta.links ?? [])[0];

              return (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className="group cursor-pointer border-b border-border/40 hover:bg-muted/40 transition-colors"
                >
                  {/* Title */}
                  <td className="py-2.5 pl-3 pr-4 font-medium text-foreground">
                    <div className="flex items-start gap-2">
                      <span className="line-clamp-2 leading-snug">{item.title}</span>
                      {primaryLink && (
                        <a
                          href={primaryLink.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 flex-none text-muted-foreground hover:text-primary"
                          title={primaryLink.label}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-4">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      STATUS_COLORS[item.board_status]
                    )}>
                      {BOARD_STATUS_LABELS[item.board_status]}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="py-2.5 px-4">
                    {item.severity && SEVERITY_ICONS[item.severity as keyof typeof SEVERITY_ICONS]}
                  </td>

                  {/* Assignee */}
                  <td className="py-2.5 px-4">
                    {item.assignee && (
                      <AssigneeAvatar
                        name={item.assignee.full_name}
                        email={item.assignee.email}
                      />
                    )}
                  </td>

                  {/* Due date */}
                  <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                    {dueDate ? formatDistanceToNow(new Date(dueDate), { addSuffix: true }) : null}
                  </td>

                  {/* Docs */}
                  <td className="py-2.5 px-4">
                    {docsUrl && (
                      <a
                        href={docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-status-success hover:underline"
                      >
                        <BookOpen className="h-3 w-3" />
                        Docs
                      </a>
                    )}
                  </td>

                  {/* Comments */}
                  <td className="py-2.5 px-4 text-center text-xs text-muted-foreground">
                    {item.comment_count > 0 ? item.comment_count : null}
                  </td>

                  {/* Created */}
                  <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <EmptyState
            icon={<MessageSquare className="h-5 w-5" />}
            title="No cards match the current filters"
            description="Try adjusting or clearing your filters."
          />
        )}
      </div>

      <Modal open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <ModalContent className="max-w-6xl p-0 overflow-hidden" style={{ borderRadius: "20px", maxHeight: "88vh" }}>
          {selectedItem && <BoardItemDialog item={selectedItem} />}
        </ModalContent>
      </Modal>
    </>
  );
}
