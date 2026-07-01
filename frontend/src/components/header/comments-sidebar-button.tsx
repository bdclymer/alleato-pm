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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { shouldForceCollaborationRuntime } from "@/lib/performance/runtime-gates";
import { useCollaborationRuntimeStore } from "@/lib/stores/collaboration-runtime-store";
import { cn } from "@/lib/utils";
import { useCommentsVisibilityStore } from "@/lib/stores/comments-visibility-store";

const rowClass =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm font-normal text-foreground transition-colors hover:bg-accent hover:text-foreground";

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
  const setCommentsVisible = useCommentsVisibilityStore(
    (state) => state.setVisible,
  );

  if (!collaborationRuntimeActive) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Comments"
            className="h-8 w-8 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="w-64 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setCollaborationRuntimeEnabled(true);
              setCommentsVisible(true);
            }}
            className={rowClass}
          >
            <MessageSquarePlus className="h-4 w-4 shrink-0" />
            Turn on page comments
          </button>
          <div className="px-2.5 pb-2 pt-1 text-xs leading-relaxed text-muted-foreground">
            Comments now load on demand so project pages do not pay the global
            collaboration startup cost before anyone asks for it.
          </div>
          <div className="my-1 h-px bg-border/50" />
          <Link
            href="/comments"
            className={cn(buttonVariants({ variant: "ghost" }), rowClass)}
          >
            <PanelRight className="h-4 w-4 shrink-0" />
            Open all comments
          </Link>
        </PopoverContent>
      </Popover>
    );
  }

  return <ActiveCommentsSidebarButton />;
}

function ActiveCommentsSidebarButton() {
  const [open, setOpen] = React.useState(false);
  const commentModeActive = useCommentModeState();
  const commentsVisible = useCommentsVisibilityStore((state) => state.visible);
  const setCommentsVisible = useCommentsVisibilityStore(
    (state) => state.setVisible,
  );

  // Close the popover automatically when comment mode activates
  React.useEffect(() => {
    if (commentModeActive) setOpen(false);
  }, [commentModeActive]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Comments"
          aria-pressed={commentModeActive ? "true" : "false"}
          className={cn(
            "h-8 w-8",
            commentModeActive
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-64 p-1 shadow-sm">
        {/* Primary action — drop a comment pin on the current page */}
        <VeltCommentTool
          sourceId="site-header-comment-mode"
          targetElementId="app-main-content"
          shadowDom={false}
        >
          {/* Leaving a comment requires the layer to be visible */}
          <span
            onClick={() => setCommentsVisible(true)}
            className={cn(rowClass, commentModeActive && "text-primary")}
            aria-label="Leave a comment"
          >
            <MessageSquarePlus className="h-4 w-4 shrink-0" />
            Leave a comment
          </span>
        </VeltCommentTool>

        {/* Show/hide the comment layer — a real on/off toggle, not a relabeling row */}
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
          aria-label="Show comments on this page"
        >
          <span className="whitespace-nowrap">Comments on this page</span>
          <Switch
            checked={commentsVisible}
            className="pointer-events-none"
            tabIndex={-1}
            aria-hidden
          />
        </div>

        <div className="my-1 h-px bg-border/50" />

        {/* View comments for THIS page in the slide-in sidebar */}
        <div onClick={() => setOpen(false)}>
          <VeltSidebarButton shadowDom={false}>
            <span className={rowClass} aria-label="View page comments">
              <PanelRight className="h-4 w-4 shrink-0" />
              View page comments
            </span>
          </VeltSidebarButton>
        </div>

        {/* Go to the dedicated page listing every comment across the whole app */}
        <Link
          href="/comments"
          onClick={() => setOpen(false)}
          className={cn(buttonVariants({ variant: "ghost" }), rowClass)}
          aria-label="All comments"
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          All comments
        </Link>
      </PopoverContent>
    </Popover>
  );
}
