"use client";

import * as React from "react";
import {
  Eye,
  EyeOff,
  MessageSquare,
  MessageSquarePlus,
  MessagesSquare,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useCommentsVisibilityStore } from "@/lib/stores/comments-visibility-store";

export function CommentsSidebarButton() {
  const [open, setOpen] = React.useState(false);
  const commentModeActive = useCommentModeState();
  const commentsVisible = useCommentsVisibilityStore((state) => state.visible);
  const toggleCommentsVisible = useCommentsVisibilityStore(
    (state) => state.toggle,
  );
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
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-52 p-1 shadow-sm"
      >
        <VeltCommentTool
          sourceId="site-header-comment-mode"
          targetElementId="app-main-content"
          shadowDom={false}
        >
          {/* Leaving a comment requires the layer to be visible */}
          <span
            onClick={() => setCommentsVisible(true)}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-full cursor-pointer justify-start gap-2.5 px-2.5 font-normal",
              commentModeActive
                ? "text-primary"
                : "text-foreground",
            )}
            aria-label="Leave a comment"
          >
            <MessageSquarePlus className="h-4 w-4 shrink-0" />
            Leave a comment
          </span>
        </VeltCommentTool>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => toggleCommentsVisible()}
          className="w-full justify-start gap-2.5 px-2.5 font-normal text-foreground"
          aria-pressed={commentsVisible ? "true" : "false"}
          aria-label={
            commentsVisible ? "Hide comments on page" : "Show comments on page"
          }
        >
          {commentsVisible ? (
            <EyeOff className="h-4 w-4 shrink-0" />
          ) : (
            <Eye className="h-4 w-4 shrink-0" />
          )}
          {commentsVisible ? "Hide comments on page" : "Show comments on page"}
        </Button>

        <div className="my-1 h-px bg-border/50" />

        <div onClick={() => setOpen(false)}>
          <VeltSidebarButton shadowDom={false}>
            <span
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "w-full cursor-pointer justify-start gap-2.5 px-2.5 font-normal text-foreground",
              )}
              aria-label="All comments"
            >
              <MessagesSquare className="h-4 w-4 shrink-0" />
              All comments
            </span>
          </VeltSidebarButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}
