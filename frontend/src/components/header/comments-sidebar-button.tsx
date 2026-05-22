"use client";

import { MessageSquare, MessageSquarePlus, Video } from "lucide-react";
import {
  VeltCommentTool,
  VeltRecorderTool,
  VeltSidebarButton,
  useCommentModeState,
} from "@veltdev/react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function HeaderIconButton({
  active,
  children,
  label,
}: {
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={active ? "true" : "false"}
          className={cn(
            "h-8 w-8",
            active
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function HeaderIconButtonShell({
  active,
  children,
  label,
}: {
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={label}
          aria-pressed={active ? "true" : "false"}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "h-8 w-8",
            active
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function CommentsSidebarButton() {
  const commentModeActive = useCommentModeState();

  return (
    <div className="flex items-center gap-1">
      <VeltCommentTool
        sourceId="site-header-comment-mode"
        targetElementId="app-main-content"
        shadowDom={false}
      >
        <HeaderIconButtonShell
          active={commentModeActive}
          label={commentModeActive ? "Exit comment mode" : "Comment mode"}
        >
          <MessageSquarePlus className="h-4 w-4" />
        </HeaderIconButtonShell>
      </VeltCommentTool>

      <VeltRecorderTool
        type="all"
        buttonLabel="Record comment"
        shadowDom={false}
        recordingCountdown
        maxLength={120}
      >
        <HeaderIconButton label="Record comment">
          <Video className="h-4 w-4" />
        </HeaderIconButton>
      </VeltRecorderTool>

      <VeltSidebarButton shadowDom={false}>
        <HeaderIconButtonShell label="Comments">
          <MessageSquare className="h-4 w-4" />
        </HeaderIconButtonShell>
      </VeltSidebarButton>
    </div>
  );
}
