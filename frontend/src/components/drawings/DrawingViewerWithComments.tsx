"use client";

import { useState, useCallback } from "react";
import { RoomProvider, ClientSideSuspense, useThreads } from "@liveblocks/react/suspense";
import { FloatingComposer, FloatingThread, CommentPin } from "@liveblocks/react-ui";
import { DrawingViewer } from "./DrawingViewer";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PendingPin {
  x: number; // percentage 0–100
  y: number; // percentage 0–100
  page: number;
}

interface DrawingViewerWithCommentsProps {
  drawingId: string;
  fileUrl: string;
  fileName?: string;
  drawingNumber?: string;
  title?: string;
  onError?: (error: Error) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onLoadSuccess?: (pdf: any) => void;
  className?: string;
  showToolbar?: boolean;
  controlledTool?: "select" | "pen" | "rectangle" | "arrow" | "text" | "eraser" | "comment";
  controlledColor?: string;
  controlledStrokeWidth?: number;
  onPageNumberChange?: (page: number, total: number) => void;
  controlledScale?: number;
  onScaleChange?: (scale: number) => void;
  controlledRotation?: number;
  onRotationChange?: (rotation: number) => void;
  linkPinsOverlay?: React.ReactNode;
  onCommentClick?: (x: number, y: number, page: number) => void;
}

// ─── Root export (provides RoomProvider) ────────────────────────────────────

export function DrawingViewerWithComments(props: DrawingViewerWithCommentsProps) {
  const roomId = `alleato:drawing:${props.drawingId}`;

  return (
    <RoomProvider id={roomId}>
      <ClientSideSuspense
        fallback={
          <DrawingViewer
            fileUrl={props.fileUrl}
            fileName={props.fileName}
            drawingNumber={props.drawingNumber}
            title={props.title}
            onError={props.onError}
            onLoadSuccess={props.onLoadSuccess}
            className={props.className}
            showToolbar={props.showToolbar}
            controlledTool={props.controlledTool}
            controlledColor={props.controlledColor}
            controlledStrokeWidth={props.controlledStrokeWidth}
            onPageNumberChange={props.onPageNumberChange}
            linkPinsOverlay={props.linkPinsOverlay}
            onCommentClick={props.onCommentClick}
          />
        }
      >
        <ViewerWithCommentState {...props} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

// ─── Inner component — uses Liveblocks hooks ─────────────────────────────────

function ViewerWithCommentState({
  drawingId: _drawingId,
  onCommentClick: parentOnCommentClick,
  ...viewerProps
}: DrawingViewerWithCommentsProps) {
  const { threads } = useThreads();
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Route clicks: "comment" tool → Liveblocks pin; anything else → parent handler
  const handleCommentClick = useCallback((x: number, y: number, page: number) => {
    if (viewerProps.controlledTool === "comment") {
      setPendingPin({ x, y, page });
    } else {
      parentOnCommentClick?.(x, y, page);
    }
  }, [viewerProps.controlledTool, parentOnCommentClick]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Threads that have canvas coordinates (placed via the comment tool)
  const pinnedThreads = threads.filter(
    (t) => typeof t.metadata.x === "number" && typeof t.metadata.y === "number"
  );

  const commentOverlay = (
    <>
      {/* Pending pin — opens FloatingComposer immediately */}
      {pendingPin && (
        <FloatingComposer
          defaultOpen
          metadata={{ x: pendingPin.x, y: pendingPin.y, page: pendingPin.page }}
          onOpenChange={(open) => {
            if (!open) setPendingPin(null);
          }}
        >
          <CommentPin
            style={{
              position: "absolute",
              left: `${pendingPin.x}%`,
              top: `${pendingPin.y}%`,
              transform: "translate(-50%, -100%)",
              zIndex: 30,
            }}
          />
        </FloatingComposer>
      )}

      {/* Existing pins — only show for the current page */}
      {pinnedThreads
        .filter(
          (t) => !t.resolved && (t.metadata.page ?? 1) === currentPage
        )
        .map((thread) => (
          <FloatingThread key={thread.id} thread={thread}>
            <CommentPin
              userId={thread.comments[0]?.userId}
              style={{
                position: "absolute",
                left: `${thread.metadata.x}%`,
                top: `${thread.metadata.y}%`,
                transform: "translate(-50%, -100%)",
                zIndex: 20,
                cursor: "pointer",
              }}
            />
          </FloatingThread>
        ))}
    </>
  );

  return (
    <DrawingViewer
      {...viewerProps}
      onCommentClick={handleCommentClick}
      commentOverlay={commentOverlay}
      onPageChange={handlePageChange}
    />
  );
}
