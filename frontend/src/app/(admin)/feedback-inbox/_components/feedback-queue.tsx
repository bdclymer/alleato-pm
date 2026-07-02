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
  FeedbackListSection,
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
          "group h-auto w-full min-w-0 items-start justify-start gap-4 rounded-none px-4 py-2.5 text-left transition-colors",
          isSelected ? "bg-background" : "hover:bg-background/60",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-start justify-between gap-4">
            <span className="min-w-0">
              <span className="line-clamp-1 min-w-0 text-sm font-medium leading-normal text-foreground">
                {itemDisplayTitle}
              </span>
              {showCommentPreview && (
                <span className="mt-0.5 line-clamp-1 text-sm font-normal leading-snug text-muted-foreground">
                  {item.comment}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs font-normal text-muted-foreground">
              {relativeTime(item.created_at)}
            </span>
          </span>

          {/* Pills for status, priority, tool, GitHub issue */}
          <span className="mt-2 flex flex-wrap items-center gap-2">
            {/* Status pill */}
            <span className={cn(
              "inline-flex items-center text-xs font-medium px-2 py-1 rounded-full",
              displayStatus === "resolved" && "bg-status-success/10 text-status-success",
              displayStatus === "open" && "bg-status-warning/10 text-status-warning",
              (displayStatus === "in_progress" || displayStatus === "pr_created") && "bg-status-info/10 text-status-info",
              displayStatus === "deferred" && "bg-muted text-muted-foreground",
            )}>
              {meta.label}
            </span>

            {/* Priority pill */}
            {item.severity === "high" && (
              <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-status-error/10 text-status-error">
                High priority
              </span>
            )}

            {/* Tool pill */}
            {toolLabel && (
              <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                {toolLabel}
              </span>
            )}

            {/* GitHub issue link */}
            {item.github_issue_number && (
              <a
                href={item.github_issue_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
              >
                <Github className="h-3 w-3" />
                #{item.github_issue_number}
              </a>
            )}
          </span>
        </span>
      </Button>
    </ListItemContextMenu>
  );
}

export function FeedbackQueue({
  sections,
  items,
  selectedId,
  loading,
  currentFilterLabel,
  onSelect,
  onUpdateStatus,
  onSendToGitHub,
  onDelete,
}: {
  sections: FeedbackListSection[];
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
    <div>
      {sections.map((section) => (
        <section key={section.status}>
          {sections.length > 1 && (
            <div className="sticky top-0 z-10 flex items-center justify-between bg-muted/95 px-4 py-2 backdrop-blur">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {section.items.length}
              </span>
            </div>
          )}
          {section.items.map((item) => (
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
        </section>
      ))}
    </div>
  );
}
