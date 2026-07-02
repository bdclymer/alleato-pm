"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, MessageSquarePlus, PanelRight } from "lucide-react";
import {
  VeltCommentTool,
  VeltSidebarButton,
  useCommentModeState,
} from "@veltdev/react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { AllCommentItem } from "@/app/api/comments/all/route";
import {
  cleanCommentPreview,
  isResolved,
  sortComments,
} from "@/app/(main)/comments/comments-page-utils";
import { apiFetch } from "@/lib/api-client";
import { shouldForceCollaborationRuntime } from "@/lib/performance/runtime-gates";
import { useCollaborationRuntimeStore } from "@/lib/stores/collaboration-runtime-store";
import { useCommentsVisibilityStore } from "@/lib/stores/comments-visibility-store";
import { cn } from "@/lib/utils";
import { useVeltCommentUnreadCount } from "@/components/notifications/velt-comment-notifications";

const rowClass =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-normal text-foreground transition-colors hover:bg-accent hover:text-foreground";

const QUICK_SCOPES = [
  { label: "All", href: "/comments?scope=all" },
  { label: "Mine", href: "/comments?scope=mine" },
  { label: "Mentions", href: "/comments?scope=mentions" },
  { label: "Unresolved", href: "/comments" },
] as const;

function useCommentSummary() {
  const { data } = useSWR<{ comments: AllCommentItem[] }>(
    "/api/comments/all",
    (url: string) => apiFetch<{ comments: AllCommentItem[] }>(url),
    { revalidateOnFocus: false },
  );

  return React.useMemo(() => {
    const comments = [...(data?.comments ?? [])].sort(sortComments);
    const unresolvedComments = comments.filter((comment) => !isResolved(comment));
    return {
      unresolved: unresolvedComments.length,
      recent: unresolvedComments.slice(0, 4),
    };
  }, [data?.comments]);
}

function CommentStatusDot({
  unread,
  unresolved,
}: {
  unread: boolean;
  unresolved: boolean;
}) {
  if (!unread && !unresolved) return null;

  return (
    <span
      className={cn(
        "absolute right-1 top-1 h-1.5 w-1.5 rounded-full",
        unread ? "bg-primary" : "bg-foreground/45",
      )}
    />
  );
}

function QuickScopeLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="grid grid-cols-4 gap-1 px-1 pb-2">
      {QUICK_SCOPES.map((scope) => (
        <Link
          key={scope.href}
          href={scope.href}
          onClick={onNavigate}
          className="rounded-full px-2 py-1 text-center text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {scope.label}
        </Link>
      ))}
    </div>
  );
}

function RecentComments({
  comments,
  onNavigate,
}: {
  comments: AllCommentItem[];
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Recent comments
      </div>
      <div className="space-y-1 px-1">
        {comments.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            No discussion yet.
          </p>
        ) : (
          comments.map((comment) => (
            <Link
              key={comment.annotationId}
              href={`/comments?scope=${isResolved(comment) ? "resolved" : "all"}`}
              onClick={onNavigate}
              className="block rounded-md px-2 py-2 hover:bg-muted"
            >
              <p className="truncate text-sm text-foreground">
                {cleanCommentPreview(comment.preview)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{comment.authorName}</p>
            </Link>
          ))
        )}
      </div>
    </>
  );
}

function CommentIconButton({
  active,
  unread,
  unresolved,
  expanded,
  onClick,
}: {
  active?: boolean;
  unread: boolean;
  unresolved: boolean;
  expanded?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Discussion"
      aria-pressed={active ? "true" : "false"}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      onClick={onClick}
      className={cn(
        "relative h-8 w-8",
        active
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : unread || unresolved
            ? "text-foreground hover:bg-accent hover:text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <MessageSquare className="h-4 w-4" />
      <CommentStatusDot unread={unread} unresolved={unresolved} />
    </Button>
  );
}

export function CommentsSidebarButton() {
  const [inactiveOpen, setInactiveOpen] = React.useState(false);
  const pathname = usePathname();
  const collaborationRuntimeEnabled = useCollaborationRuntimeStore(
    (state) => state.enabled,
  );
  const setCollaborationRuntimeEnabled = useCollaborationRuntimeStore(
    (state) => state.setEnabled,
  );
  const collaborationRuntimeActive =
    collaborationRuntimeEnabled || shouldForceCollaborationRuntime(pathname);
  const setCommentsVisible = useCommentsVisibilityStore(
    (state) => state.setVisible,
  );
  const unreadCount = useVeltCommentUnreadCount();
  const summary = useCommentSummary();
  const hasUnread = unreadCount > 0;
  const hasUnresolved = summary.unresolved > 0;

  if (!collaborationRuntimeActive) {
    return (
      <Popover open={inactiveOpen} onOpenChange={setInactiveOpen}>
        <PopoverTrigger asChild>
          <CommentIconButton
            unread={hasUnread}
            unresolved={hasUnresolved}
            expanded={inactiveOpen}
            onClick={() => setInactiveOpen((open) => !open)}
          />
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="w-80 p-2 shadow-sm">
          <div className="px-2 pb-2 pt-1">
            <p className="text-sm font-semibold text-foreground">Discussion</p>
          </div>
          <QuickScopeLinks />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setInactiveOpen(false);
              setCollaborationRuntimeEnabled(true);
              setCommentsVisible(true);
            }}
            className={rowClass}
          >
            <MessageSquarePlus className="h-4 w-4 shrink-0" />
            Show annotations
          </Button>
          <div className="my-2 h-px bg-border/50" />
          <RecentComments comments={summary.recent} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <ActiveCommentsSidebarButton
      summary={summary}
      hasUnread={hasUnread}
      hasUnresolved={hasUnresolved}
    />
  );
}

function ActiveCommentsSidebarButton({
  summary,
  hasUnread,
  hasUnresolved,
}: {
  summary: { unresolved: number; recent: AllCommentItem[] };
  hasUnread: boolean;
  hasUnresolved: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const commentModeActive = useCommentModeState();
  const commentsVisible = useCommentsVisibilityStore((state) => state.visible);
  const setCommentsVisible = useCommentsVisibilityStore(
    (state) => state.setVisible,
  );

  React.useEffect(() => {
    if (commentModeActive) setOpen(false);
  }, [commentModeActive]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <CommentIconButton
          active={commentModeActive}
          unread={hasUnread}
          unresolved={hasUnresolved}
          expanded={open}
          onClick={() => setOpen((value) => !value)}
        />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-80 p-2 shadow-sm">
        <div className="px-2 pb-2 pt-1">
          <p className="text-sm font-semibold text-foreground">Discussion</p>
        </div>
        <QuickScopeLinks onNavigate={() => setOpen(false)} />

        <VeltCommentTool
          sourceId="site-header-comment-mode"
          targetElementId="app-main-content"
          shadowDom={false}
        >
          <span
            onClick={() => setCommentsVisible(true)}
            className={cn(rowClass, commentModeActive && "text-primary")}
            aria-label="Add comment"
          >
            <MessageSquarePlus className="h-4 w-4 shrink-0" />
            Add comment
          </span>
        </VeltCommentTool>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setCommentsVisible(!commentsVisible)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setCommentsVisible(!commentsVisible);
            }
          }}
          className={cn(rowClass, "justify-between")}
          aria-label="Show annotations on this page"
        >
          <span className="whitespace-nowrap">Show annotations</span>
          <Switch
            checked={commentsVisible}
            className="pointer-events-none"
            tabIndex={-1}
            aria-hidden
          />
        </div>

        <div className="my-2 h-px bg-border/50" />

        <div onClick={() => setOpen(false)}>
          <VeltSidebarButton shadowDom={false}>
            <span className={rowClass} aria-label="Open page discussion">
              <PanelRight className="h-4 w-4 shrink-0" />
              Open page discussion
            </span>
          </VeltSidebarButton>
        </div>

        <div className="my-2 h-px bg-border/50" />
        <RecentComments comments={summary.recent} onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
