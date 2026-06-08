"use client";

import * as React from "react";
import { MessageSquare, MessageSquarePlus, MessagesSquare } from "lucide-react";
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

export function CommentsSidebarButton() {
  const [open, setOpen] = React.useState(false);
  const commentModeActive = useCommentModeState();

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
          <span
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
