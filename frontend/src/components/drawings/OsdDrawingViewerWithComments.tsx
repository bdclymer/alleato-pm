"use client";

import { useCallback, useMemo, useState } from "react";
import { Link2, MessageSquare, Trash2, X } from "lucide-react";
import { VeltCommentTool } from "@veltdev/react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  OsdDrawingViewer,
  type AnnotationTool,
  type CommittedAnnotationInfo,
  type HtmlOverlay,
  type LocalAnnotationType,
  type OsdDrawingViewerProps,
} from "./OsdDrawingViewer";

interface PendingPin {
  xPct: number;
  yPct: number;
  page: number;
}

export interface OsdDrawingViewerWithCommentsProps
  extends Omit<OsdDrawingViewerProps, "htmlOverlays" | "onCommentClick" | "onAnnotationCommitted"> {
  drawingId: string;
  /** Additional pins (e.g. link pins) to render on top of the drawing. */
  extraOverlays?: HtmlOverlay[];
  /** Notified for non-comment tool clicks (e.g. when the link tool is active). */
  onCommentClick?: (xPct: number, yPct: number, page: number) => void;
  /** Called when the user picks "Link" from the action bar shown after drawing a shape (cloud/rectangle/arrow). */
  onShapeLinkRequest?: (xPct: number, yPct: number, page: number) => void;
  /** Kept for layer-toggle API compatibility; Velt comments are controlled globally. */
  showCommentPins?: boolean;
  /** Restrict drawn-markup visibility (forwarded to viewer). */
  visibleAnnotationTypes?: LocalAnnotationType[];
}

export function OsdDrawingViewerWithComments({
  drawingId,
  controlledTool,
  onCommentClick: parentOnCommentClick,
  onShapeLinkRequest,
  onPageNumberChange: parentOnPageNumberChange,
  extraOverlays,
  ...viewerProps
}: OsdDrawingViewerWithCommentsProps) {
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [shapeAction, setShapeAction] = useState<CommittedAnnotationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleAnnotationCommitted = useCallback((info: CommittedAnnotationInfo) => {
    setShapeAction(info);
  }, []);

  const handleCommentClick = useCallback(
    (xPct: number, yPct: number, page: number) => {
      if (controlledTool === "comment") {
        setPendingPin({ xPct, yPct, page });
        return;
      }

      parentOnCommentClick?.(xPct, yPct, page);
    },
    [controlledTool, parentOnCommentClick],
  );

  const handlePageNumberChange = useCallback(
    (page: number, total: number) => {
      setCurrentPage(page);
      parentOnPageNumberChange?.(page, total);
    },
    [parentOnPageNumberChange],
  );

  const overlays: HtmlOverlay[] = useMemo(() => {
    const list: HtmlOverlay[] = [];

    if (pendingPin && pendingPin.page === currentPage) {
      list.push({
        id: "pending-comment-pin",
        xPct: pendingPin.xPct,
        yPct: pendingPin.yPct,
        page: pendingPin.page,
        placement: "BOTTOM",
        zIndex: 30,
        element: (
          <div className="inline-flex items-center gap-1">
            <VeltCommentTool
              sourceId={`drawing:${drawingId}:${pendingPin.page}:${pendingPin.xPct}:${pendingPin.yPct}`}
              targetElementId="app-main-content"
              shadowDom={false}
              context={{
                surface: "drawing-viewer",
                drawingId,
                page: pendingPin.page,
                x: pendingPin.xPct,
                y: pendingPin.yPct,
              }}
            >
              <span
                className={buttonVariants({
                  variant: "secondary",
                  size: "sm",
                  className: "inline-flex h-auto items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                })}
                onClick={() => setPendingPin(null)}
              >
                <MessageSquare className="h-3 w-3" />
                <span>Comment</span>
              </span>
            </VeltCommentTool>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 rounded-full p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setPendingPin(null)}
              aria-label="Cancel"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ),
      });
    }

    if (shapeAction && shapeAction.page === currentPage) {
      list.push({
        id: `shape-action-${shapeAction.id}`,
        xPct: shapeAction.xPct,
        yPct: shapeAction.yPct,
        page: shapeAction.page,
        placement: "BOTTOM",
        zIndex: 30,
        element: (
          <div className="inline-flex items-center gap-1 rounded-full bg-card p-0.5 shadow-sm">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-auto items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
              onClick={() => {
                onShapeLinkRequest?.(shapeAction.xPct, shapeAction.yPct, shapeAction.page);
                setShapeAction(null);
              }}
            >
              <Link2 className="h-3 w-3" />
              <span>Link</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 rounded-full p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                shapeAction.remove();
                setShapeAction(null);
              }}
              aria-label="Delete markup"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 rounded-full p-0 text-muted-foreground hover:bg-muted"
              onClick={() => setShapeAction(null)}
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ),
      });
    }

    if (extraOverlays && extraOverlays.length > 0) {
      list.push(...extraOverlays);
    }

    return list;
  }, [currentPage, drawingId, extraOverlays, onShapeLinkRequest, pendingPin, shapeAction]);

  return (
    <OsdDrawingViewer
      {...viewerProps}
      drawingId={drawingId}
      controlledTool={controlledTool}
      onCommentClick={handleCommentClick}
      onAnnotationCommitted={handleAnnotationCommitted}
      onPageNumberChange={handlePageNumberChange}
      htmlOverlays={overlays}
    />
  );
}

export type { AnnotationTool };
