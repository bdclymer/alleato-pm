"use client";

import { useState, type ReactNode } from "react";
import { GitCommitHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ChangeCardProps = {
  title: string;
  /** Short subtitle shown on the collapsed card (e.g. truncated impact). */
  preview?: string;
  /** Full detail shown in the expanded dialog. */
  detail?: string;
  /** Source links rendered at the bottom of the expanded dialog. */
  sources?: ReactNode;
};

/**
 * Collapsed list row that expands into a dialog with the full change detail.
 * Mirrors the compact card → modal interaction used elsewhere in the app:
 * an icon tile + title + one-line preview, opening a centered dialog on click.
 */
export function ChangeCard({ title, preview, detail, sources }: ChangeCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="flex h-auto w-full items-center justify-start gap-3 rounded-lg bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-background">
          <GitCommitHorizontal className="h-4 w-4 text-muted-foreground" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{title}</span>
          {preview ? (
            <span className="block truncate text-sm font-normal text-muted-foreground">{preview}</span>
          ) : null}
        </span>
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {detail ? (
            <DialogDescription className="text-sm leading-6 text-muted-foreground">
              {detail}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {sources}
      </DialogContent>
    </Dialog>
  );
}
