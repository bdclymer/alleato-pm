"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { MessageSquare, X } from "lucide-react";
import { VeltCommentTool } from "@veltdev/react";

import { Button, buttonVariants } from "@/components/ui/button";
import { DrawingViewer } from "./DrawingViewer";

interface PendingPin {
  x: number;
  y: number;
  page: number;
}

interface DrawingViewerWithCommentsProps {
  drawingId: string;
  fileUrl: string;
  fileName?: string;
  drawingNumber?: string;
  title?: string;
  onError?: (error: Error) => void;
  onLoadSuccess?: (pdf: { numPages: number }) => void;
  className?: string;
  showToolbar?: boolean;
  controlledTool?: "select" | "pen" | "highlighter" | "rectangle" | "arrow" | "text" | "eraser" | "comment" | "link";
  controlledColor?: string;
  controlledStrokeWidth?: number;
  onPageNumberChange?: (page: number, total: number) => void;
  controlledScale?: number;
  onScaleChange?: (scale: number) => void;
  controlledRotation?: number;
  onRotationChange?: (rotation: number) => void;
  linkPinsOverlay?: React.ReactNode;
  onCommentClick?: (x: number, y: number, page: number) => void;
  showCommentPins?: boolean;
  visibleAnnotationTypes?: ("pen" | "highlighter" | "rectangle" | "arrow" | "text")[];
}

export function DrawingViewerWithComments({
  drawingId,
  onCommentClick: parentOnCommentClick,
  ...viewerProps
}: DrawingViewerWithCommentsProps) {
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleCommentClick = useCallback((x: number, y: number, page: number) => {
    if (viewerProps.controlledTool === "comment") {
      setPendingPin({ x, y, page });
      return;
    }

    parentOnCommentClick?.(x, y, page);
  }, [parentOnCommentClick, viewerProps.controlledTool]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const pendingPinStyle: CSSProperties | undefined = pendingPin
    ? {
        position: "absolute",
        left: `${pendingPin.x}%`,
        top: `${pendingPin.y}%`,
        transform: "translate(-50%, -100%)",
        zIndex: 30,
      }
    : undefined;

  const commentOverlay =
    pendingPin && pendingPin.page === currentPage ? (
      <div className="inline-flex items-center gap-1" style={pendingPinStyle}>
        <VeltCommentTool
          sourceId={`drawing:${drawingId}:${pendingPin.page}:${pendingPin.x}:${pendingPin.y}`}
          targetElementId="app-main-content"
          shadowDom={false}
          context={{
            surface: "drawing-viewer",
            drawingId,
            page: pendingPin.page,
            x: pendingPin.x,
            y: pendingPin.y,
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
          title="Cancel"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    ) : null;

  return (
    <DrawingViewer
      {...viewerProps}
      onCommentClick={handleCommentClick}
      commentOverlay={commentOverlay}
      onPageChange={handlePageChange}
      visibleAnnotationTypes={viewerProps.visibleAnnotationTypes}
    />
  );
}
