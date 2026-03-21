"use client";

import { useState, useCallback, type CSSProperties } from "react";
import { RoomProvider, ClientSideSuspense, useThreads } from "@liveblocks/react/suspense";
import { FloatingComposer, FloatingThread, CommentPin } from "@liveblocks/react-ui";
import { MessageSquare } from "lucide-react";
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
  showCommentPins?: boolean;
  visibleAnnotationTypes?: ("pen" | "rectangle" | "arrow" | "text")[];
}

// ─── Root export (provides RoomProvider) ────────────────────────────────────

export function DrawingViewerWithComments(props: DrawingViewerWithCommentsProps) {
  const roomId = `alleato:drawing:${props.drawingId}`;

  return (
    <RoomProvider id={roomId} initialPresence={{ cursor: null }} initialStorage={{} as any}>
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
            controlledScale={props.controlledScale}
            onScaleChange={props.onScaleChange}
            controlledRotation={props.controlledRotation}
            onRotationChange={props.onRotationChange}
            linkPinsOverlay={props.linkPinsOverlay}
            onCommentClick={props.onCommentClick}
            visibleAnnotationTypes={props.visibleAnnotationTypes}
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
  const [isPendingComposerOpen, setIsPendingComposerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Route clicks: "comment" tool → Liveblocks pin; anything else → parent handler
  const handleCommentClick = useCallback((x: number, y: number, page: number) => {
    if (viewerProps.controlledTool === "comment") {
      setPendingPin({ x, y, page });
      setIsPendingComposerOpen(false);
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

  const pendingPinStyle: CSSProperties | undefined = pendingPin
    ? {
        position: "absolute",
        left: `${pendingPin.x}%`,
        top: `${pendingPin.y}%`,
        transform: "translate(-50%, -100%)",
        zIndex: 30,
      }
    : undefined;

  const commentOverlay = (
    <>
      {/* Pending pin — show a compact reply trigger until the composer is explicitly opened */}
      {pendingPin && (
        <FloatingComposer
          defaultOpen={false}
          metadata={{ x: pendingPin.x, y: pendingPin.y, page: pendingPin.page }}
          open={isPendingComposerOpen}
          onOpenChange={(open) => {
            setIsPendingComposerOpen(open);
          }}
          onComposerSubmit={() => {
            setPendingPin(null);
            setIsPendingComposerOpen(false);
          }}
        >
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/95 px-2.5 py-1 text-[11px] font-medium text-zinc-100 shadow-sm transition-colors hover:border-zinc-500 hover:bg-zinc-800"
            style={pendingPinStyle}
            onClick={() => setIsPendingComposerOpen(true)}
          >
            <MessageSquare className="h-3 w-3" />
            <span>Reply</span>
          </button>
        </FloatingComposer>
      )}

      {/* Existing pins — only show for the current page */}
      {viewerProps.showCommentPins !== false && pinnedThreads
        .filter(
          (t) => !t.resolved && ((t.metadata as Record<string, unknown>).page ?? 1) === currentPage
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
      visibleAnnotationTypes={viewerProps.visibleAnnotationTypes}
    />
  );
}
