"use client";

import { useCallback, useMemo, useState } from "react";
import { RoomProvider, ClientSideSuspense, useThreads } from "@liveblocks/react/suspense";
import { FloatingComposer, FloatingThread, CommentPin } from "@liveblocks/react-ui";
import { LiveList, LiveObject } from "@liveblocks/client";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  OsdDrawingViewer,
  type AnnotationTool,
  type HtmlOverlay,
  type LocalAnnotationType,
  type OsdDrawingViewerProps,
} from "./OsdDrawingViewer";

interface PendingPin {
  xPct: number;
  yPct: number;
  page: number;
}

// Matches the project-wide Liveblocks Storage schema (see comments-sidebar.tsx).
// Drawings don't actually use these fields, but the typed RoomProvider requires
// the full shape.
const INITIAL_STORAGE = {
  meta: new LiveObject({ title: "" }),
  properties: new LiveObject({
    progress: "none" as const,
    priority: "none" as const,
    assignedTo: "none",
  }),
  labels: new LiveList<string>([]),
  links: new LiveList<string>([]),
};

export interface OsdDrawingViewerWithCommentsProps
  extends Omit<OsdDrawingViewerProps, "htmlOverlays" | "onCommentClick"> {
  drawingId: string;
  /** Additional pins (e.g. link pins) to render on top of the drawing. */
  extraOverlays?: HtmlOverlay[];
  /** Notified for non-comment tool clicks (e.g. when the link tool is active). */
  onCommentClick?: (xPct: number, yPct: number, page: number) => void;
  /** Hide all Liveblocks comment pins (toggle from a layer filter). */
  showCommentPins?: boolean;
  /** Restrict drawn-markup visibility (forwarded to viewer). */
  visibleAnnotationTypes?: LocalAnnotationType[];
}

// ─── Root wrapper — provides the Liveblocks room ────────────────────────────

export function OsdDrawingViewerWithComments(props: OsdDrawingViewerWithCommentsProps) {
  const roomId = `alleato:drawing:${props.drawingId}`;

  return (
    <RoomProvider id={roomId} initialPresence={{ cursor: null }} initialStorage={INITIAL_STORAGE}>
      <ClientSideSuspense
        fallback={
          // Render the viewer with link pins only while Liveblocks initializes.
          <OsdDrawingViewer
            {...stripWrapperProps(props)}
            htmlOverlays={props.extraOverlays}
            onCommentClick={props.onCommentClick}
          />
        }
      >
        <ViewerWithCommentState {...props} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

// ─── Inner — uses Liveblocks hooks ──────────────────────────────────────────

function ViewerWithCommentState({
  drawingId: _drawingId,
  controlledTool,
  onCommentClick: parentOnCommentClick,
  onPageNumberChange: parentOnPageNumberChange,
  showCommentPins = true,
  extraOverlays,
  ...viewerProps
}: OsdDrawingViewerWithCommentsProps) {
  const { threads } = useThreads();
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [isPendingComposerOpen, setIsPendingComposerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const handleCommentClick = useCallback(
    (xPct: number, yPct: number, page: number) => {
      if (controlledTool === "comment") {
        setPendingPin({ xPct, yPct, page });
        setIsPendingComposerOpen(true);
      } else {
        parentOnCommentClick?.(xPct, yPct, page);
      }
    },
    [controlledTool, parentOnCommentClick]
  );

  // Critical: depend on the extracted prop, NOT on the rest-spread `viewerProps`
  // object — the rest spread is a new object literal every render, so including
  // it in deps gives this callback a fresh identity on every render. The viewer
  // then sees onPageNumberChange change every render → its useEffect fires →
  // calls back here → setState → re-render → infinite loop (React #185).
  const handlePageNumberChange = useCallback(
    (page: number, total: number) => {
      setCurrentPage(page);
      parentOnPageNumberChange?.(page, total);
    },
    [parentOnPageNumberChange]
  );

  // Filter threads to those with canvas coordinates.
  const pinnedThreads = useMemo(
    () =>
      threads.filter(
        (t) =>
          typeof t.metadata.x === "number" &&
          typeof t.metadata.y === "number" &&
          !t.resolved
      ),
    [threads]
  );

  // Build the htmlOverlays list combining comment pins + any extras (link pins).
  const overlays: HtmlOverlay[] = useMemo(() => {
    const list: HtmlOverlay[] = [];

    if (pendingPin) {
      list.push({
        id: "pending-comment-pin",
        xPct: pendingPin.xPct,
        yPct: pendingPin.yPct,
        page: pendingPin.page,
        placement: "BOTTOM",
        zIndex: 30,
        element: (
          <FloatingComposer
            defaultOpen={false}
            metadata={{ x: pendingPin.xPct, y: pendingPin.yPct, page: pendingPin.page }}
            open={isPendingComposerOpen}
            onOpenChange={setIsPendingComposerOpen}
            onComposerSubmit={() => {
              setPendingPin(null);
              setIsPendingComposerOpen(false);
            }}
          >
            <div className="inline-flex items-center gap-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium h-auto"
                onClick={() => setIsPendingComposerOpen(true)}
              >
                <MessageSquare className="h-3 w-3" />
                <span>Reply</span>
              </Button>
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
          </FloatingComposer>
        ),
      });
    }

    if (showCommentPins) {
      for (const thread of pinnedThreads) {
        const meta = thread.metadata as Record<string, unknown>;
        const page = typeof meta.page === "number" ? meta.page : 1;
        if (page !== currentPage) continue;
        const xPct = meta.x as number;
        const yPct = meta.y as number;
        list.push({
          id: thread.id,
          xPct,
          yPct,
          page,
          placement: "BOTTOM",
          zIndex: 20,
          element: (
            <FloatingThread thread={thread}>
              <CommentPin
                userId={thread.comments[0]?.userId}
                style={{ cursor: "pointer" }}
              />
            </FloatingThread>
          ),
        });
      }
    }

    if (extraOverlays && extraOverlays.length > 0) {
      list.push(...extraOverlays);
    }

    return list;
  }, [pendingPin, isPendingComposerOpen, showCommentPins, pinnedThreads, currentPage, extraOverlays]);

  return (
    <OsdDrawingViewer
      {...viewerProps}
      controlledTool={controlledTool}
      onCommentClick={handleCommentClick}
      onPageNumberChange={handlePageNumberChange}
      htmlOverlays={overlays}
    />
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function stripWrapperProps(p: OsdDrawingViewerWithCommentsProps): OsdDrawingViewerProps {
  const {
    // intentionally drop wrapper-only props
    drawingId: _drawingId,
    extraOverlays: _extraOverlays,
    showCommentPins: _showCommentPins,
    onCommentClick: _onCommentClick,
    ...rest
  } = p;
  return rest;
}

// Re-export the AnnotationTool type for convenience.
export type { AnnotationTool };
