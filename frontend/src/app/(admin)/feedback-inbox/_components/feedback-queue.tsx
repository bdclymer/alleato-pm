"use client";

import { Github } from "lucide-react";
import { Button } from "@/components/ds";
import { displayAdminFeedbackTitle, isCommentRedundantWithTitle } from "@/lib/admin-feedback/title";
import { cn } from "@/lib/utils";

import { STATUS_META } from "../constants";
import {
  relativeTime,
  submitterLabel,
  toDisplayStatus,
  toolLabelFromPath,
} from "../helpers";
import type {
  DisplayStatus,
  FeedbackItem,
} from "../types";

import { ListItemContextMenu } from "./list-item-context-menu";

function FeedbackQueueItem({
  item,
  selectedId,
  onSelect,
  onUpdateStatus,
  onSendToGitHub,
  onDelete,
}: {
  item: FeedbackItem;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdateStatus: (id: string, status: DisplayStatus) => void;
  onSendToGitHub: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const displayStatus = toDisplayStatus(item.status);
  const meta = STATUS_META[displayStatus];
  const isSelected = selectedId === item.id;
  const itemDisplayTitle = displayAdminFeedbackTitle({
    storedTitle: item.title,
    requestType: item.request_type,
    comment: item.comment,
    targetText: item.target_text,
    pageTitle: item.page_title,
  });
  const toolLabel = toolLabelFromPath(item.page_path);
  const showCommentPreview = !isCommentRedundantWithTitle(itemDisplayTitle, item.comment);
  const sourceLabel = toolLabel ?? item.page_title ?? item.page_path;

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
          "group relative h-auto w-full min-w-0 items-start justify-start gap-4 rounded-none px-4 py-3 text-left transition-colors",
          isSelected
            ? "bg-background shadow-[inset_3px_0_0_hsl(var(--primary))]"
            : "hover:bg-background/60",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-start justify-between gap-3">
            <span className="min-w-0 space-y-0.5">
              <span className="line-clamp-1 min-w-0 text-[13px] font-semibold leading-normal text-foreground">
                {itemDisplayTitle}
              </span>
              {showCommentPreview && (
                <span className="line-clamp-1 text-[13px] font-normal leading-snug text-muted-foreground">
                  {item.comment}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs font-normal text-muted-foreground">
              {relativeTime(item.created_at)}
            </span>
          </span>

          <span className="mt-2 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", meta.dotClassName)}
              aria-hidden
            />
            <span className="shrink-0">{meta.label}</span>
            <span aria-hidden className="text-border">
              /
            </span>
            {item.severity === "high" && (
              <>
                <span className="shrink-0 font-medium text-status-error">
                  High priority
                </span>
                <span aria-hidden className="text-border">
                  /
                </span>
              </>
            )}
            {sourceLabel && (
              <span className="inline-flex min-w-0 items-center truncate">
                <span className="truncate">{sourceLabel}</span>
              </span>
            )}
            {item.github_issue_number && item.github_issue_url && (
              <>
                <span aria-hidden className="text-border">
                  /
                </span>
              <a
                href={item.github_issue_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-primary hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                <Github className="h-3 w-3" />
                #{item.github_issue_number}
              </a>
              </>
            )}
          </span>
        </span>
      </Button>
    </ListItemContextMenu>
  );
}

export function FeedbackQueue({
  items,
  selectedId,
  loading,
  currentFilterLabel,
  onSelect,
  onUpdateStatus,
  onSendToGitHub,
  onDelete,
}: {
  items: FeedbackItem[];
  selectedId: string | null;
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
      <div className="flex h-full min-h-48 items-center justify-center px-6 text-center">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">No feedback items</p>
          <p className="text-sm text-muted-foreground">
            No {currentFilterLabel.toLowerCase()} items found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {items.map((item) => (
        <FeedbackQueueItem
          key={item.id}
          item={item}
          selectedId={selectedId}
          onSelect={onSelect}
          onUpdateStatus={onUpdateStatus}
          onSendToGitHub={onSendToGitHub}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
