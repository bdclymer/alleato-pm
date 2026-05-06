"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow, isPast, differenceInDays } from "date-fns";
import { Zap, AlertTriangle, Minus, MessageSquare, Clock, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContent,
  MorphingDialogContainer,
} from "@/components/motion/morphing-dialog";
import { BoardItemDialog } from "./board-item-dialog";
import type { BoardItem, BoardAssignee } from "./use-product-board";
import type { BoardItemMeta, BoardLabel } from "./use-board-item";
import type { CardViewSettings } from "./card-view-settings";
import { DEFAULT_CARD_VIEW_SETTINGS } from "./card-view-settings";

type BoardItemWithMeta = BoardItem;

const severityConfig = {
  high: { icon: <AlertTriangle className="h-3 w-3" />, className: "text-destructive" },
  medium: { icon: <Zap className="h-3 w-3" />, className: "text-yellow-500" },
  low: { icon: <Minus className="h-3 w-3" />, className: "text-muted-foreground" },
};

function DueDateChip({ dateStr }: { dateStr: string }) {
  const date = new Date(dateStr);
  const overdue = isPast(date);
  const soon = !overdue && differenceInDays(date, new Date()) <= 2;
  return (
    <span className={cn(
      "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
      overdue && "bg-destructive/10 text-destructive",
      soon && !overdue && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      !overdue && !soon && "bg-muted text-muted-foreground"
    )}>
      <Clock className="h-2.5 w-2.5" />
      {formatDistanceToNow(date, { addSuffix: true })}
    </span>
  );
}

function LabelStrips({ labels }: { labels: BoardLabel[] }) {
  if (!labels.length) return null;
  return (
    <div className="flex gap-1 mb-2">
      {labels.slice(0, 5).map((l) => (
        <span
          key={l.id}
          title={l.name || l.color}
          className={cn("h-1.5 flex-1 rounded-full", l.color)}
        />
      ))}
    </div>
  );
}

function AssigneeAvatar({ assignee }: { assignee: BoardAssignee }) {
  const initials = assignee.full_name
    ? assignee.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : assignee.email[0].toUpperCase();
  return (
    <div
      className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-foreground"
      title={assignee.full_name ?? assignee.email}
    >
      {initials}
    </div>
  );
}

interface BoardCardProps {
  item: BoardItemWithMeta;
  readonly?: boolean;
  settings?: CardViewSettings;
}

export function BoardCard({ item, readonly, settings = DEFAULT_CARD_VIEW_SETTINGS }: BoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: readonly });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const meta = (item.metadata as BoardItemMeta | null) ?? {};
  const labels = meta.labels ?? [];
  const links = meta.links ?? [];
  const dueDate = meta.due_date;
  const severity = item.severity ? severityConfig[item.severity as keyof typeof severityConfig] : null;
  const primaryLink = links[0];

  const hasFooter =
    (settings.showDueDate && dueDate) ||
    (settings.showSeverity && severity) ||
    (settings.showCommentCount && item.comment_count > 0) ||
    (settings.showAssignee && item.assignee);

  return (
    <div ref={setNodeRef} style={style} className={cn("transition-opacity duration-150", isDragging && "opacity-40")}>
      <MorphingDialog transition={{ type: "spring", stiffness: 220, damping: 28 }}>
        <motion.div
          whileHover={!isDragging ? { y: -2, scale: 1.012 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        >
          <MorphingDialogTrigger
            {...(!readonly ? attributes : {})}
            {...(!readonly ? listeners : {})}
            style={{ borderRadius: "10px" }}
            className={cn(
              "w-full text-left bg-background select-none block overflow-hidden",
              "shadow-xs transition-shadow duration-200 hover:shadow-sm",
              !readonly && "cursor-pointer"
            )}
          >
            {/* Cover image */}
            {settings.showCover && item.screenshot_url && (
              <div className="h-48 w-full overflow-hidden">
                <img
                  src={item.screenshot_url}
                  alt="Card cover"
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </div>
            )}

            <div className="p-3">
              {/* Label strips */}
              {settings.showLabels && labels.length > 0 && (
                <LabelStrips labels={labels} />
              )}

              <p className="text-sm font-medium leading-snug text-foreground line-clamp-3">
                {item.title}
              </p>

              {/* Description preview */}
              {settings.showDescription && item.comment && (
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                  {item.comment}
                </p>
              )}

              {/* Live link chip */}
              {settings.showLinkPreview && primaryLink && (
                <a
                  href={primaryLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary/8 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/15 transition-colors max-w-full"
                >
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{primaryLink.label}</span>
                </a>
              )}

              {/* Source */}
              {item.page_title && item.page_title !== "Product Board" && (
                <p className="mt-1 text-[11px] text-muted-foreground/60 truncate">
                  {item.page_title}
                </p>
              )}

              {/* Footer */}
              {hasFooter && (
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {settings.showDueDate && dueDate && <DueDateChip dateStr={dueDate} />}
                    {settings.showSeverity && severity && (
                      <span className={cn("flex items-center", severity.className)}>
                        {severity.icon}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {settings.showCommentCount && item.comment_count > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {item.comment_count}
                      </span>
                    )}
                    {settings.showAssignee && item.assignee && (
                      <AssigneeAvatar assignee={item.assignee as BoardAssignee} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </MorphingDialogTrigger>
        </motion.div>

        <MorphingDialogContainer overlayClassName="bg-foreground/10 backdrop-blur-sm dark:bg-black/50">
          <MorphingDialogContent
            style={{ borderRadius: "20px" }}
            className="relative w-full max-w-6xl bg-background overflow-hidden mx-4"
          >
            <div style={{ maxHeight: "88vh", overflow: "hidden" }}>
              <BoardItemDialog item={item} />
            </div>
          </MorphingDialogContent>
        </MorphingDialogContainer>
      </MorphingDialog>
    </div>
  );
}

export function BoardCardOverlay({ item }: { item: BoardItem }) {
  return (
    <div className="rounded-xl bg-background p-3 shadow-sm ring-1 ring-primary/30 rotate-1 scale-[1.02] opacity-95">
      <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">{item.title}</p>
    </div>
  );
}
