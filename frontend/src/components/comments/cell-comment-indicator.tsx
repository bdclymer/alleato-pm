"use client";

import { MessageSquare } from "lucide-react";
import { FloatingComposer, FloatingThread } from "@liveblocks/react-ui";
import { useCellThread } from "./cell-thread-context";

interface CellCommentIndicatorProps {
  rowId: string;
  columnId: string;
}

/**
 * Renders a small comment icon on a table cell.
 * - If a thread exists for this cell → shows FloatingThread on click
 * - If no thread → shows FloatingComposer on click to create one
 *
 * Uses the CellThreadContext to find matching threads by rowId + columnId metadata.
 */
export function CellCommentIndicator({
  rowId,
  columnId,
}: CellCommentIndicatorProps) {
  const context = useCellThread();

  // Gracefully degrade when not inside a CellThreadProvider
  if (!context) return null;

  const { threads, openCell, setOpenCell } = context;

  const metadata = { rowId, columnId };
  const isOpen =
    openCell?.rowId === rowId && openCell?.columnId === columnId;

  // Find thread for this specific cell
  const thread = threads.find(
    (t) =>
      t.metadata.rowId === rowId &&
      t.metadata.columnId === columnId &&
      !t.metadata.resolved,
  );

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenCell(isOpen ? null : metadata);
  };

  if (thread) {
    return (
      <FloatingThread
        thread={thread}
        defaultOpen={false}
        open={isOpen}
        onOpenChange={(open) => setOpenCell(open ? metadata : null)}
        style={{ zIndex: 50 }}
      >
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center justify-center h-5 w-5 rounded text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
          aria-label="View comment"
        >
          <MessageSquare className="h-3 w-3 fill-primary" />
        </button>
      </FloatingThread>
    );
  }

  return (
    <FloatingComposer
      metadata={metadata}
      defaultOpen={false}
      open={isOpen}
      onOpenChange={(open) => setOpenCell(open ? metadata : null)}
      onComposerSubmit={() => setOpenCell(metadata)}
      style={{ zIndex: 50 }}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50 transition-colors flex-shrink-0 opacity-0 group-hover/cell:opacity-100"
        aria-label="Add comment"
      >
        <MessageSquare className="h-3 w-3" />
      </button>
    </FloatingComposer>
  );
}
