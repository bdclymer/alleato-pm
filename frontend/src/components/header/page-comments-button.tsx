"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePageCommentsStore } from "@/lib/stores/page-comments-store";

// Header chat-bubble icon that toggles click-anywhere comment mode. When on, the
// PageCommentsOverlay mounts and the page becomes clickable to drop a comment
// pin; when off, nothing sits on the page. Gated by NEXT_PUBLIC_PAGE_COMMENTS.
export function PageCommentsButton() {
  const active = usePageCommentsStore((state) => state.active);
  const toggle = usePageCommentsStore((state) => state.toggle);

  if (process.env.NEXT_PUBLIC_PAGE_COMMENTS !== "on") return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Comment on this page"
          aria-pressed={active}
          onClick={toggle}
          className={cn(
            "relative h-8 w-8",
            active
              ? "bg-accent text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {active ? "Exit comment mode" : "Comment on this page"}
      </TooltipContent>
    </Tooltip>
  );
}
