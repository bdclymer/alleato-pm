"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLink,
  Eye,
  EyeOff,
  MessageSquare,
  Plus,
} from "lucide-react";
import {
  VeltCommentTool,
  useCommentModeState,
} from "@veltdev/react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SheetDescription,
} from "@/components/ui/sheet";
import {
  SidePanel,
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@/components/ui/side-panel";
import type { AllCommentItem } from "@/app/api/comments/all/route";
import { cleanCommentPreview, sortComments } from "@/app/(main)/comments/comments-page-utils";
import { apiFetch } from "@/lib/api-client";
import { shouldForceCollaborationRuntime } from "@/lib/performance/runtime-gates";
import { useCollaborationRuntimeStore } from "@/lib/stores/collaboration-runtime-store";
import { useCommentsVisibilityStore } from "@/lib/stores/comments-visibility-store";
import { cn } from "@/lib/utils";
import { useVeltCommentUnreadCount } from "@/components/notifications/velt-comment-notifications";

function useCommentSummary() {
  const { data } = useSWR<{ comments: AllCommentItem[] }>(
    "/api/comments/all",
    (url: string) => apiFetch<{ comments: AllCommentItem[] }>(url),
    { revalidateOnFocus: false },
  );

  return React.useMemo(() => {
    const comments = [...(data?.comments ?? [])].sort(sortComments);
    return {
      comments,
      unresolved: comments.filter((comment) => comment.statusName !== "resolved").length,
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

type CommentIconButtonProps = React.ComponentProps<typeof Button> & {
  active?: boolean;
  unread: boolean;
  unresolved: boolean;
  expanded?: boolean;
};

const CommentIconButton = React.forwardRef<HTMLButtonElement, CommentIconButtonProps>(
function CommentIconButton({
  active,
  unread,
  unresolved,
  expanded,
  className,
  ...props
}, ref) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Discussion"
      aria-pressed={active ? "true" : "false"}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      {...props}
      className={cn(
        "relative h-8 w-8",
        active
          ? "text-foreground hover:bg-accent hover:text-foreground"
          : unread || unresolved
            ? "text-foreground hover:bg-accent hover:text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      <MessageSquare className="h-4 w-4" />
      <CommentStatusDot unread={unread} unresolved={unresolved} />
    </Button>
  );
});

function handleDiscussionTriggerKeyDown(
  event: React.KeyboardEvent<HTMLButtonElement>,
  open: boolean,
  setOpen: React.Dispatch<React.SetStateAction<boolean>>,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    event.stopPropagation();
    setOpen((current) => !current);
    return;
  }

  if (event.key === "Escape" && open) {
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
  }
}

function SiteCommentsLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/comments"
            onClick={onNavigate}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View all site comments
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-56">
          Listing of all comments throughout the site.
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function CommentsSidebarButton() {
  const pathname = usePathname();
  const collaborationRuntimeEnabled = useCollaborationRuntimeStore(
    (state) => state.enabled,
  );
  const setCollaborationRuntimeEnabled = useCollaborationRuntimeStore(
    (state) => state.setEnabled,
  );
  const collaborationRuntimeActive =
    collaborationRuntimeEnabled || shouldForceCollaborationRuntime(pathname);
  const commentsVisible = useCommentsVisibilityStore((state) => state.visible);
  const setCommentsVisible = useCommentsVisibilityStore(
    (state) => state.setVisible,
  );
  const [pendingCommentMode, setPendingCommentMode] = React.useState(false);
  const [pageSheetOpen, setPageSheetOpen] = React.useState(false);
  const unreadCount = useVeltCommentUnreadCount();
  const summary = useCommentSummary();
  const hasUnread = unreadCount > 0;
  const hasUnresolved = summary.unresolved > 0;
  const pageComments = React.useMemo(
    () =>
      summary.comments.filter((comment) => {
        if (!pathname) return false;
        return comment.documentId === pathname;
      }),
    [pathname, summary.comments],
  );

  const openPageDiscussion = React.useCallback(() => {
    window.setTimeout(() => {
      setPageSheetOpen(true);
    }, 120);
  }, []);

  return (
    <>
      <ActiveCommentsSidebarButton
        hasUnread={hasUnread}
        hasUnresolved={hasUnresolved}
        collaborationRuntimeActive={collaborationRuntimeActive}
        startCommentOnMount={pendingCommentMode}
        onCommentModeStarted={() => setPendingCommentMode(false)}
        onRequestCommentMode={() => {
          setCollaborationRuntimeEnabled(true);
          setCommentsVisible(true);
          setPendingCommentMode(true);
        }}
        onOpenPageSheet={() => {
          setCommentsVisible(true);
          openPageDiscussion();
        }}
      />
      <PageDiscussionSheet
        open={pageSheetOpen}
        onOpenChange={setPageSheetOpen}
        comments={pageComments}
      />
    </>
  );
}

function ActiveCommentsSidebarButton({
  hasUnread,
  hasUnresolved,
  collaborationRuntimeActive,
  startCommentOnMount,
  onCommentModeStarted,
  onRequestCommentMode,
  onOpenPageSheet,
}: {
  hasUnread: boolean;
  hasUnresolved: boolean;
  collaborationRuntimeActive: boolean;
  startCommentOnMount?: boolean;
  onCommentModeStarted?: () => void;
  onRequestCommentMode: () => void;
  onOpenPageSheet: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const commentModeActive = useCommentModeState();
  const commentsVisible = useCommentsVisibilityStore((state) => state.visible);
  const setCommentsVisible = useCommentsVisibilityStore(
    (state) => state.setVisible,
  );
  const addCommentTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const handleOpenDiscussion = React.useCallback(() => {
    setOpen(false);
    onOpenPageSheet();
  }, [onOpenPageSheet]);

  React.useEffect(() => {
    if (commentModeActive) setOpen(false);
  }, [commentModeActive]);

  React.useEffect(() => {
    if (!startCommentOnMount || commentModeActive) return;

    const frame = window.requestAnimationFrame(() => {
      addCommentTriggerRef.current?.click();
      onCommentModeStarted?.();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [commentModeActive, onCommentModeStarted, startCommentOnMount]);

  return (
    <>
      {collaborationRuntimeActive ? (
        <VeltCommentTool
          sourceId="site-header-comment-mode"
          targetElementId="app-main-content"
          shadowDom={false}
        >
          <Button
            ref={addCommentTriggerRef}
            type="button"
            variant="ghost"
            size="sm"
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          >
            Start comment mode
          </Button>
        </VeltCommentTool>
      ) : null}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <CommentIconButton
            active={commentModeActive}
            unread={hasUnread}
            unresolved={hasUnresolved}
            expanded={open}
            onClick={() => setOpen((current) => !current)}
            onKeyDown={(event) => handleDiscussionTriggerKeyDown(event, open, setOpen)}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="w-56">
          <DropdownMenuItem
            onSelect={() => {
              setOpen(false);
              if (!collaborationRuntimeActive) {
                onRequestCommentMode();
                return;
              }
              setCommentsVisible(true);
              addCommentTriggerRef.current?.click();
            }}
          >
            <Plus className="h-4 w-4" />
            Add comment
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleOpenDiscussion}
            onSelect={(event) => {
              event.preventDefault();
              handleOpenDiscussion();
            }}
          >
            <MessageSquare className="h-4 w-4" />
            View discussion
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setOpen(false);
              setCommentsVisible(!commentsVisible);
            }}
          >
            {commentsVisible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {commentsVisible ? "Hide comments" : "View comments"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function PageDiscussionSheet({
  open,
  onOpenChange,
  comments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comments: AllCommentItem[];
}) {
  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      <SidePanelContent side="right" size="md">
        <SidePanelHeader className="border-b border-border/60 text-left">
          <SidePanelTitle>Discussion</SidePanelTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {comments.length === 1 ? "1 comment" : `${comments.length} comments`}
          </SheetDescription>
        </SidePanelHeader>
        <div className="flex h-full flex-col">
          <SidePanelBody className="py-4">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No page discussion yet.
              </p>
            ) : (
              <div className="space-y-0">
                {comments.map((comment, index) => (
                  <div
                    key={comment.annotationId}
                    className={cn(
                      "py-4",
                      index > 0 && "border-t border-border/60",
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">
                        {comment.authorName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {comment.replyCount > 0
                          ? `${comment.replyCount + 1} messages`
                          : "1 message"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {cleanCommentPreview(comment.preview)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SidePanelBody>
          <SidePanelFooter className="border-t border-border/60 py-3">
            <SiteCommentsLink />
          </SidePanelFooter>
        </div>
      </SidePanelContent>
    </SidePanel>
  );
}
