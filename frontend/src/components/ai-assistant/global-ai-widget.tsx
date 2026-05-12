"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, Ellipsis, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CompactAiChat, type CompactAiChatView } from "./compact-ai-chat";

function focusFirstPanelElement(panel: HTMLDivElement) {
  const focusable = panel.querySelector<HTMLElement>(
    'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
  );
  focusable?.focus();
}

export function GlobalAiWidget() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [view, setView] = React.useState<CompactAiChatView>("chat");
  const [expanded, setExpanded] = React.useState(false);
  const [hasUnread, setHasUnread] = React.useState(false);
  const launcherRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const openRef = React.useRef(open);

  React.useEffect(() => {
    openRef.current = open;
    if (open) setHasUnread(false);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }

    const timeout = window.setTimeout(() => setMounted(false), 240);
    return () => window.clearTimeout(timeout);
  }, [open]);

  const closePanel = React.useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => {
      launcherRef.current?.focus();
    });
  }, []);

  const openPanel = React.useCallback(() => {
    setOpen(true);
    setHasUnread(false);
  }, []);

  const handleAssistantActivity = React.useCallback(() => {
    if (!openRef.current) setHasUnread(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    function handleWindowKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closePanel();
    }

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [closePanel, open]);

  const handlePanelKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("aria-hidden"));

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [closePanel],
  );

  React.useEffect(() => {
    if (!open || !panelRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      if (panelRef.current) focusFirstPanelElement(panelRef.current);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  return (
    <>
      {mounted && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Ask Alleato"
          onKeyDown={handlePanelKeyDown}
          className={cn(
            "global-ai-widget-panel flex flex-col overflow-hidden rounded-xl bg-background",
            "transition-[opacity,transform] duration-200 ease-out",
            expanded && "global-ai-widget-panel-expanded",
            open
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-5 opacity-0",
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-3 py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {view === "chat" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setView("history")}
                  aria-label="View AI assistant messages"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <div className="h-8 w-8 shrink-0" aria-hidden="true" />
              )}

              <div className="flex min-w-0 items-center gap-2">
                {view === "chat" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Sparkles
                      className="size-4 text-primary"
                      strokeWidth={1.8}
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {view === "history" ? "Messages" : "Ask Alleato"}
                  </p>
                  {view === "chat" && (
                    <p className="truncate text-xs text-muted-foreground">
                      The team can also help
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setExpanded((value) => !value)}
                aria-label={
                  expanded ? "Collapse AI assistant" : "Expand AI assistant"
                }
                aria-pressed={expanded}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Ellipsis className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={closePanel}
                aria-label="Close AI assistant"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <CompactAiChat
              autoFocusComposer={open && view === "chat"}
              view={view}
              onViewChange={setView}
              onAssistantActivity={handleAssistantActivity}
            />
          </div>
        </div>
      )}

      <Button
        ref={launcherRef}
        type="button"
        variant="default"
        aria-label={open ? "Minimize AI assistant" : "Open AI assistant"}
        onClick={open ? closePanel : openPanel}
        className={cn(
          "global-ai-widget-launcher flex items-center justify-center rounded-full bg-primary text-primary-foreground",
          "transition-[transform,opacity,box-shadow] duration-150 ease-out",
          "hover:-translate-y-px hover:scale-[1.02] active:scale-[0.97]",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        )}
      >
        {open ? (
          <ChevronDown className="size-6" strokeWidth={2.2} />
        ) : (
          <Sparkles className="size-6" strokeWidth={1.9} />
        )}
        {!open && hasUnread && (
          <span
            className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-destructive"
            aria-hidden="true"
          />
        )}
      </Button>
    </>
  );
}
