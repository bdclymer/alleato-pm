"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCommentsSidebarStore } from "@/lib/stores/comments-sidebar-store";
import { cn } from "@/lib/utils";

/** Open the comments sidebar from anywhere in the app without loading Liveblocks. */
export function openCommentsSidebar() {
  window.dispatchEvent(new CustomEvent("open-comments-sidebar"));
}

export function CommentsSidebarButton() {
  const toggle = useCommentsSidebarStore((s) => s.toggle);
  const open = useCommentsSidebarStore((s) => s.open);
  const setOpen = useCommentsSidebarStore((s) => s.setOpen);

  React.useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-comments-sidebar", handler);
    return () => window.removeEventListener("open-comments-sidebar", handler);
  }, [setOpen]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "relative h-8 w-8 p-0 transition-colors",
        open
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-label="Comments"
      aria-pressed={open}
      onClick={toggle}
    >
      <MessageSquare className="h-4 w-4" />
    </Button>
  );
}
