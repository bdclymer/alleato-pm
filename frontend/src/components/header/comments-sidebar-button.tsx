"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { MessageSquare, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VeltCommentsSidebar = dynamic(
  () => import("@veltdev/react").then((m) => m.VeltCommentsSidebar),
  { ssr: false },
);

function CommentsPanelContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-5 py-4">
        <span className="text-sm font-semibold text-foreground">Comments</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close comments"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Velt sidebar fills the scroll area */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <VeltCommentsSidebar groupConfig={{ enable: true }} />
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border/50 px-5 py-3">
        <Link
          href="/comments"
          onClick={onClose}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          See all incoming activity →
        </Link>
      </div>
    </div>
  );
}

export function CommentsSidebarButton() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Small delay so the toggle click doesn't immediately close the panel
    const t = setTimeout(() => window.addEventListener("mousedown", handler), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousedown", handler);
    };
  }, [open]);

  return (
    <>
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
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MessageSquare className="h-4 w-4" />
      </Button>

      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-300",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-80 bg-background shadow-sm transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-label="Comments panel"
        role="dialog"
        aria-modal="true"
      >
        {open && <CommentsPanelContent onClose={() => setOpen(false)} />}
      </div>
    </>
  );
}
