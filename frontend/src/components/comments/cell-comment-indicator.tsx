"use client";

import { MessageSquarePlus } from "lucide-react";
import { VeltCommentTool } from "@veltdev/react";

interface CellCommentIndicatorProps {
  rowId: string;
  columnId: string;
}

/**
 * Cell-level comment entry point backed by Velt.
 * The global Velt document scopes the thread to the current page; row/column
 * metadata lets the sidebar group and filter budget-cell comments later.
 */
export function CellCommentIndicator({
  rowId,
  columnId,
}: CellCommentIndicatorProps) {
  return (
    <VeltCommentTool
      sourceId={`budget-cell:${rowId}:${columnId}`}
      targetElementId="app-main-content"
      shadowDom={false}
      context={{
        surface: "budget-table-cell",
        rowId,
        columnId,
      }}
    >
      <span
        aria-label="Comment on cell"
        className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-muted-foreground/30 opacity-0 transition-colors hover:bg-muted/50 hover:text-muted-foreground group-hover/cell:opacity-100"
      >
        <MessageSquarePlus className="h-3 w-3" />
      </span>
    </VeltCommentTool>
  );
}
