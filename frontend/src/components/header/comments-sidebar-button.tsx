"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Eye,
  EyeOff,
  MessageSquare,
  Plus,
  SendHorizontal,
} from "lucide-react";
import {
  VeltCommentTool,
  useCommentModeState,
  useCommentUtils,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AllCommentItem } from "@/app/api/comments/all/route";
import {
  cleanCommentPreview,
  relativeTimeLabel,
  sortComments,
} from "@/app/(main)/comments/comments-page-utils";
import { apiFetch } from "@/lib/api-client";
import { shouldForceCollaborationRuntime } from "@/lib/performance/runtime-gates";
import { useCollaborationRuntimeStore } from "@/lib/stores/collaboration-runtime-store";
import { useCommentsVisibilityStore } from "@/lib/stores/comments-visibility-store";
import { cn } from "@/lib/utils";

function useCommentSummary() {
  const { data } = useSWR<{ comments: AllCommentItem[] }>(
    "/api/comments/all",
    (url: string) => apiFetch<{ comments: AllCommentItem[] }>(url),
    { revalidateOnFocus: false },
  );

  return React.useMemo(() => {
    const comments = [...(data?.comments ?? [])].sort(sortComments);
    return { comments };
  }, [data?.comments]);
}

function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "C"
  );
}

type CommentIconButtonProps = React.ComponentProps<typeof Button> & {
  active?: boolean;
  expanded?: boolean;
};

const CommentIconButton = React.forwardRef<HTMLButtonElement, CommentIconButtonProps>(
function CommentIconButton({
  active,
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
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      <MessageSquare className="h-4 w-4" />
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
            View all comments
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
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [focusedAnnotationId, setFocusedAnnotationId] = React.useState<string | null>(null);
  const summary = useCommentSummary();
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

  React.useEffect(() => {
    const requestedDiscussionId = searchParams.get("discussion");
    if (!requestedDiscussionId) {
      return;
    }

    setFocusedAnnotationId(requestedDiscussionId);
    setCommentsVisible(true);
    openPageDiscussion();

    const params = new URLSearchParams(searchParams.toString());
    params.delete("discussion");
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [
    openPageDiscussion,
    pathname,
    router,
    searchParams,
    setCommentsVisible,
  ]);

  return (
    <>
      <ActiveCommentsSidebarButton
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
        onOpenChange={(nextOpen) => {
          setPageSheetOpen(nextOpen);
          if (!nextOpen) {
            setFocusedAnnotationId(null);
          }
        }}
        comments={pageComments}
        focusedAnnotationId={focusedAnnotationId}
        onAddComment={() => {
          setPageSheetOpen(false);
          if (!collaborationRuntimeActive) {
            setCollaborationRuntimeEnabled(true);
          }
          setCommentsVisible(true);
          setPendingCommentMode(true);
        }}
      />
    </>
  );
}

function ActiveCommentsSidebarButton({
  collaborationRuntimeActive,
  startCommentOnMount,
  onCommentModeStarted,
  onRequestCommentMode,
  onOpenPageSheet,
}: {
  collaborationRuntimeActive: boolean;
  startCommentOnMount?: boolean;
  onCommentModeStarted?: () => void;
  onRequestCommentMode: () => void;
  onOpenPageSheet: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const commentModeActive = useCommentModeState();
  const commentElement = useCommentUtils();
  const commentsVisible = useCommentsVisibilityStore((state) => state.visible);
  const setCommentsVisible = useCommentsVisibilityStore(
    (state) => state.setVisible,
  );
  const addCommentTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const setPageCommentsVisible = React.useCallback(
    (nextVisible: boolean) => {
      setCommentsVisible(nextVisible);

      if (!commentElement) return;

      if (nextVisible) {
        commentElement.showCommentsOnDom();
        return;
      }

      commentElement.selectCommentByAnnotationId();
      commentElement.closeCommentSidebar();
      commentElement.disableCommentMode();
      commentElement.hideCommentsOnDom();
    },
    [commentElement, setCommentsVisible],
  );
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
              setPageCommentsVisible(true);
              addCommentTriggerRef.current?.click();
            }}
          >
            <Plus className="h-4 w-4" />
            Add Comment
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleOpenDiscussion}
            onSelect={(event) => {
              event.preventDefault();
              handleOpenDiscussion();
            }}
          >
            <MessageSquare className="h-4 w-4" />
            Page Comments
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setOpen(false);
              setPageCommentsVisible(!commentsVisible);
            }}
          >
            {commentsVisible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {commentsVisible ? "Hide Comments" : "View Comments"}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/comments"
              onClick={() => setOpen(false)}
              className="cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              All Comments
            </Link>
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
  focusedAnnotationId,
  onAddComment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comments: AllCommentItem[];
  focusedAnnotationId?: string | null;
  onAddComment: () => void;
}) {
  const totalMessages = React.useMemo(() => {
    return comments.reduce(
      (count, comment) => count + Math.max(comment.messages?.length ?? 0, 1),
      0,
    );
  }, [comments]);
  const orderedComments = React.useMemo(() => {
    return [...comments].sort((left, right) => {
      if (left.annotationId === focusedAnnotationId) return -1;
      if (right.annotationId === focusedAnnotationId) return 1;
      return (right.lastUpdated ?? 0) - (left.lastUpdated ?? 0);
    });
  }, [comments, focusedAnnotationId]);

  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      <SidePanelContent side="right" size="compact">
        <SidePanelHeader className="border-b border-border/60 text-left">
          <SidePanelTitle>Comments</SidePanelTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {totalMessages === 1 ? "1 comment" : `${totalMessages} comments`}
          </SheetDescription>
        </SidePanelHeader>
        <div className="flex h-full flex-col">
          <SidePanelBody className="px-4 py-2">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No page discussion yet.
              </p>
            ) : (
              <div className="space-y-0">
                {orderedComments.map((comment, index) => (
                  <div
                    key={comment.annotationId}
                    className={cn(
                      "py-3.5",
                      index > 0 && "border-t border-border/60",
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-lg px-2 py-1.5",
                        comment.annotationId === focusedAnnotationId && "bg-muted/40",
                      )}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {comment.authorName}
                            </span>
                            {comment.annotationId === focusedAnnotationId ? (
                              <span className="text-[11px] font-medium text-primary">
                                Opened from notification
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {comment.replyCount > 0
                              ? `${comment.replyCount} replies`
                              : "No replies yet"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(comment.messages.length > 0
                          ? comment.messages
                          : [
                              {
                                commentId: `${comment.annotationId}:preview`,
                                authorName: comment.authorName,
                                text: comment.preview,
                                createdAt: comment.lastUpdated,
                              },
                            ]).map((message) => (
                          <div key={message.commentId} className="flex gap-3">
                            <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-muted text-[10px] font-semibold text-foreground">
                                {initials(message.authorName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold text-foreground">
                                  {message.authorName}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {relativeTimeLabel(message.createdAt)}
                                </span>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
                                {cleanCommentPreview(message.text)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SidePanelBody>
          <SidePanelFooter className="border-t border-border/60 px-4 py-3">
            <div className="flex w-full flex-col gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onAddComment}
                className="h-auto w-full justify-between rounded-full border border-border bg-background px-4 py-2.5 hover:bg-muted/40"
              >
                <span className="text-sm text-muted-foreground">Reply on page</span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <SendHorizontal className="h-4 w-4" />
                </span>
              </Button>
              <SiteCommentsLink />
            </div>
          </SidePanelFooter>
        </div>
      </SidePanelContent>
    </SidePanel>
  );
}
