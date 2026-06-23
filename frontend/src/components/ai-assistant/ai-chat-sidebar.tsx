"use client";

import * as React from "react";
import { BrainCircuit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiChatSidebarStore } from "@/lib/stores/ai-chat-sidebar-store";
import { cn } from "@/lib/utils";
import { CompactAiChat } from "./compact-ai-chat";

const AI_CHAT_SIDEBAR_WIDTH = "var(--ai-chat-sidebar-width, 380px)";

export function AiChatSidebarButton({ className }: { className?: string }) {
  const { open, toggle } = useAiChatSidebarStore();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label="Toggle AI strategist"
      aria-pressed={open}
      className={cn(
        "h-8 w-8",
        open
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      <BrainCircuit className="h-4 w-4" strokeWidth={1.5} />
    </Button>
  );
}

export function AiChatSidebarPanel() {
  const open = useAiChatSidebarStore((state) => state.open);
  const setOpen = useAiChatSidebarStore((state) => state.setOpen);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }

    const timeout = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(timeout);
  }, [open]);

  return (
    <div
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-card",
        "transition-[width] duration-300 ease-in-out",
        open ? "border-r" : "w-0 border-r-0",
      )}
      style={{ width: open ? AI_CHAT_SIDEBAR_WIDTH : 0 }}
    >
      {mounted && (
        <div
          className="flex h-full w-full min-w-0 flex-col"
          style={{ width: AI_CHAT_SIDEBAR_WIDTH }}
        >
          <div className="flex shrink-0 items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                <BrainCircuit className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-medium text-foreground">AI Strategist</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              aria-label="Close AI chat"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CompactAiChat />
          </div>
        </div>
      )}
    </div>
  );
}
