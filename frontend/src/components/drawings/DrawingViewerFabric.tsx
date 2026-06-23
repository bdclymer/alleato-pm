"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  Canvas as FabricCanvas,
  IText,
  Rect,
  Path,
  PencilBrush,
  type FabricObject,
  type TPointerEventInfo,
} from "fabric";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ds";
import { cn } from "@/lib/utils";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AnnotationTool =
  | "select"
  | "pen"
  | "highlighter"
  | "rectangle"
  | "arrow"
  | "text"
  | "eraser"
  | "comment"
  | "link";

type LocalAnnotationType = "pen" | "highlighter" | "rectangle" | "arrow" | "text";

type PdfDocumentProxy = { numPages: number };
type PdfPageProxy = { originalWidth: number; originalHeight: number };

export interface DrawingViewerFabricProps {
  fileUrl: string;
  fileName?: string;
  drawingNumber?: string;
  title?: string;
  onError?: (error: Error) => void;
  onLoadSuccess?: (pdf: PdfDocumentProxy) => void;
  className?: string;
  onCommentClick?: (x: number, y: number, page: number) => void;
  commentOverlay?: React.ReactNode;
  linkPinsOverlay?: React.ReactNode;
  onPageChange?: (page: number) => void;
  showToolbar?: boolean;
  controlledTool?: AnnotationTool;
  controlledColor?: string;
  controlledStrokeWidth?: number;
  onPageNumberChange?: (page: number, total: number) => void;
  controlledScale?: number;
  onScaleChange?: (scale: number) => void;
  controlledRotation?: number;
  onRotationChange?: (rotation: number) => void;
  visibleAnnotationTypes?: LocalAnnotationType[];
}

// ─── Arrow path helper ────────────────────────────────────────────────────────

function buildArrowSvgPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  const headLen = 14;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const w1x = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const w1y = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const w2x = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const w2y = y2 - headLen * Math.sin(angle + Math.PI / 6);
  return `M ${x1} ${y1} L ${x2} ${y2} M ${x2} ${y2} L ${w1x} ${w1y} M ${x2} ${y2} L ${w2x} ${w2y}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DrawingViewerFabric({
  fileUrl,
  onError,
  onLoadSuccess,
  className,
  onCommentClick,
  commentOverlay,
  linkPinsOverlay,
  onPageNumberChange,
  controlledTool,
  controlledColor = "#ef4444",
  controlledStrokeWidth = 2,
  controlledScale,
  onScaleChange,
  controlledRotation = 0,
  visibleAnnotationTypes,
}: DrawingViewerFabricProps) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState({ width: 800, height: 600 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Internal scale — fit-to-container on first load, then user-controlled
  const containerRef = useRef<HTMLDivElement>(null);
  const originalPageRef = useRef({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  // Drag-draw state
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const inProgressObjRef = useRef<FabricObject | null>(null);

  const resolvedTool = controlledTool ?? "select";
  const resolvedColor = controlledColor;
  const resolvedStrokeWidth = controlledStrokeWidth;

  // ── Fit scale on container resize ────────────────────────────────────────

  const recalcFitScale = useCallback(() => {
    const container = containerRef.current;
    if (!container || !originalPageRef.current.width) return;
    const { width: pw, height: ph } = originalPageRef.current;
    const cw = container.clientWidth - 32; // padding
    const ch = container.clientHeight - 32;
    const fitScale = Math.min(cw / pw, ch / ph, 1);
    setScale(fitScale);
    onScaleChange?.(fitScale);
  }, [onScaleChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(recalcFitScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recalcFitScale]);

  // Sync external scale
  useEffect(() => {
    if (controlledScale !== undefined) {
      setScale(controlledScale);
    }
  }, [controlledScale]);

  // ── PDF callbacks ─────────────────────────────────────────────────────────

  const onDocumentLoadSuccess = useCallback(
    (pdf: PdfDocumentProxy) => {
      setNumPages(pdf.numPages);
      setIsLoading(false);
      setLoadError(null);
      onLoadSuccess?.(pdf);
      onPageNumberChange?.(1, pdf.numPages);
    },
    [onLoadSuccess, onPageNumberChange]
  );

  const onDocumentLoadError = useCallback(
    (err: Error) => {
      setLoadError(err.message);
      setIsLoading(false);
      onError?.(err);
    },
    [onError]
  );

  const onPageLoadSuccess = useCallback(
    (page: PdfPageProxy) => {
      originalPageRef.current = {
        width: page.originalWidth,
        height: page.originalHeight,
      };
      const w = page.originalWidth * scale;
      const h = page.originalHeight * scale;
      setPageSize({ width: w, height: h });
      const fc = fabricRef.current;
      if (fc) {
        fc.setDimensions({ width: w, height: h });
        fc.renderAll();
      }
      recalcFitScale();
    },
    [scale, recalcFitScale]
  );

  // ── Fabric canvas init ────────────────────────────────────────────────────

  useEffect(() => {
    const el = canvasElRef.current;
    if (!el || fabricRef.current) return;

    const fc = new FabricCanvas(el, {
      width: pageSize.width,
      height: pageSize.height,
      selection: false,
      renderOnAddRemove: true,
    });
    fabricRef.current = fc;

    // Fabric wraps `el` in a .canvas-container div (with lower-canvas + upper-canvas).
    // The container is in normal doc flow — we must make it absolute to overlay the PDF.
    const container = el.closest(".canvas-container") || el.parentElement;
    if (container && container !== el.ownerDocument?.body) {
      (container as HTMLElement).style.position = "absolute";
      (container as HTMLElement).style.top = "0";
      (container as HTMLElement).style.left = "0";
      (container as HTMLElement).style.zIndex = "10";
    }

    return () => {
      fc.dispose();
      fabricRef.current = null;
    };
     
  }, []);

  // Resize fabric canvas when pageSize changes
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.setDimensions({ width: pageSize.width, height: pageSize.height });
    fc.renderAll();
  }, [pageSize]);

  // ── Tool configuration ────────────────────────────────────────────────────

  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    const makeObjectsInert = (evented = false) => {
      fc.getObjects().forEach((o) => o.set({ selectable: false, evented }));
    };

    switch (resolvedTool) {
      case "select":
        fc.isDrawingMode = false;
        fc.selection = true;
        fc.getObjects().forEach((o) =>
          o.set({ selectable: true, evented: true })
        );
        fc.defaultCursor = "default";
        break;

      case "pen": {
        fc.isDrawingMode = true;
        const brush = new PencilBrush(fc);
        brush.color = resolvedColor;
        brush.width = resolvedStrokeWidth * 2;
        fc.freeDrawingBrush = brush;
        makeObjectsInert();
        break;
      }

      case "highlighter": {
        fc.isDrawingMode = true;
        const brush = new PencilBrush(fc);
        brush.color = resolvedColor;
        brush.width = 24;
        fc.freeDrawingBrush = brush;
        makeObjectsInert();
        break;
      }

      case "text":
        fc.isDrawingMode = false;
        fc.selection = false;
        fc.defaultCursor = "text";
        makeObjectsInert();
        break;

      case "rectangle":
        fc.isDrawingMode = false;
        fc.selection = false;
        fc.defaultCursor = "crosshair";
        makeObjectsInert();
        break;

      case "arrow":
        fc.isDrawingMode = false;
        fc.selection = false;
        fc.defaultCursor = "crosshair";
        makeObjectsInert();
        break;

      case "eraser":
        fc.isDrawingMode = false;
        fc.selection = false;
        fc.defaultCursor = "cell";
        makeObjectsInert(true); // objects need events so they can be targeted
        break;

      case "comment":
      case "link":
        fc.isDrawingMode = false;
        fc.selection = false;
        fc.defaultCursor = "crosshair";
        makeObjectsInert();
        break;
    }

    fc.renderAll();
  }, [resolvedTool, resolvedColor, resolvedStrokeWidth]);

  // Apply opacity to highlighter paths after creation
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    const onPathCreated = ({ path }: { path: FabricObject }) => {
      const type = resolvedTool === "highlighter" ? "highlighter" : "pen";
      if (type === "highlighter") {
        path.set({ opacity: 0.28 });
      }
      // Mark with annotation type for visibility filtering
      (path as FabricObject & { annotationType?: string }).annotationType = type;
      path.set({ selectable: false, evented: false });
      fc.renderAll();
    };

    fc.on("path:created", onPathCreated as Parameters<typeof fc.on>[1]);
    return () => fc.off("path:created", onPathCreated as Parameters<typeof fc.on>[1]);
  }, [resolvedTool]);

  // ── Mouse event handlers ──────────────────────────────────────────────────

  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    const onMouseDown = (
      e: TPointerEventInfo & { target?: FabricObject }
    ) => {
      const { x, y } = e.pointer;

      // comment / link tools — forward click as percentage coords
      if (resolvedTool === "comment" || resolvedTool === "link") {
        const xPct = (x / pageSize.width) * 100;
        const yPct = (y / pageSize.height) * 100;
        onCommentClick?.(xPct, yPct, pageNumber);
        return;
      }

      if (resolvedTool === "text") {
        const itext = new IText("", {
          left: x,
          top: y,
          fontSize: Math.max(14, resolvedStrokeWidth * 6 + 10),
          fill: resolvedColor,
          selectable: true,
          evented: true,
          cursorColor: resolvedColor,
          editingBorderColor: resolvedColor,
        });
        (itext as FabricObject & { annotationType?: string }).annotationType =
          "text";
        fc.add(itext);
        fc.setActiveObject(itext);
        itext.enterEditing();

        // Remove empty text on exit, lock in place when done editing
        itext.on("editing:exited", () => {
          if (!itext.text?.trim()) {
            fc.remove(itext);
          } else {
            itext.set({ selectable: false, evented: false });
          }
          fc.renderAll();
        });
        return;
      }

      if (resolvedTool === "rectangle") {
        drawStartRef.current = { x, y };
        const rect = new Rect({
          left: x,
          top: y,
          width: 0,
          height: 0,
          fill: resolvedColor + "40", // 25% opacity
          stroke: resolvedColor,
          strokeWidth: resolvedStrokeWidth,
          selectable: false,
          evented: false,
        });
        (rect as FabricObject & { annotationType?: string }).annotationType =
          "rectangle";
        fc.add(rect);
        inProgressObjRef.current = rect;
        return;
      }

      if (resolvedTool === "arrow") {
        drawStartRef.current = { x, y };
        return;
      }

      if (resolvedTool === "eraser" && e.target) {
        fc.remove(e.target);
        fc.renderAll();
      }
    };

    const onMouseMove = (e: TPointerEventInfo) => {
      const { x, y } = e.pointer;
      const start = drawStartRef.current;
      if (!start) return;

      if (resolvedTool === "rectangle") {
        const rect = inProgressObjRef.current as Rect;
        if (!rect) return;
        const w = x - start.x;
        const h = y - start.y;
        rect.set({
          left: w < 0 ? x : start.x,
          top: h < 0 ? y : start.y,
          width: Math.abs(w),
          height: Math.abs(h),
        });
        fc.renderAll();
        return;
      }

      if (resolvedTool === "arrow") {
        // Remove old in-progress arrow and redraw
        if (inProgressObjRef.current) {
          fc.remove(inProgressObjRef.current);
        }
        const pathStr = buildArrowSvgPath(start.x, start.y, x, y);
        const arrow = new Path(pathStr, {
          stroke: resolvedColor,
          strokeWidth: resolvedStrokeWidth,
          fill: "",
          selectable: false,
          evented: false,
        });
        (arrow as FabricObject & { annotationType?: string }).annotationType =
          "arrow";
        fc.add(arrow);
        inProgressObjRef.current = arrow;
        fc.renderAll();
      }
    };

    const onMouseUp = () => {
      // Finalize rectangle — remove zero-size ones
      if (resolvedTool === "rectangle" && inProgressObjRef.current) {
        const rect = inProgressObjRef.current as Rect;
        if ((rect.width ?? 0) < 3 && (rect.height ?? 0) < 3) {
          fc.remove(rect);
          fc.renderAll();
        }
      }
      drawStartRef.current = null;
      inProgressObjRef.current = null;
    };

    fc.on("mouse:down", onMouseDown as Parameters<typeof fc.on>[1]);
    fc.on("mouse:move", onMouseMove as Parameters<typeof fc.on>[1]);
    fc.on("mouse:up", onMouseUp);

    return () => {
      fc.off("mouse:down", onMouseDown as Parameters<typeof fc.on>[1]);
      fc.off("mouse:move", onMouseMove as Parameters<typeof fc.on>[1]);
      fc.off("mouse:up", onMouseUp);
    };
  }, [
    resolvedTool,
    resolvedColor,
    resolvedStrokeWidth,
    pageSize,
    pageNumber,
    onCommentClick,
  ]);

  // ── Annotation visibility ─────────────────────────────────────────────────

  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc || !visibleAnnotationTypes) return;
    const visible = new Set(visibleAnnotationTypes);
    fc.getObjects().forEach((obj) => {
      const type = (obj as FabricObject & { annotationType?: string })
        .annotationType;
      if (type) obj.set({ visible: visible.has(type as LocalAnnotationType) });
    });
    fc.renderAll();
  }, [visibleAnnotationTypes]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+Z = undo (remove last object)
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        const objects = fc.getObjects();
        // Don't undo if a text object is actively being edited
        const editingText = objects.find(
          (o) => o instanceof IText && (o as IText).isEditing
        );
        if (editingText) return;
        if (objects.length > 0) {
          fc.remove(objects[objects.length - 1]);
          fc.renderAll();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── Page navigation ───────────────────────────────────────────────────────

  const goToPage = (p: number) => {
    const clamped = Math.max(1, Math.min(numPages, p));
    setPageNumber(clamped);
    onPageNumberChange?.(clamped, numPages);
  };

  // ── Rotation ──────────────────────────────────────────────────────────────

  const rotation = controlledRotation ?? 0;

  // ── Cursor for fabric canvas ──────────────────────────────────────────────

  const fabricPointerEvents =
    resolvedTool === "comment" || resolvedTool === "link"
      ? "none"
      : "auto";

  // Keep fabric canvas-container pointer-events in sync with the active tool
  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;
    const container = el.closest(".canvas-container") || el.parentElement;
    if (container) (container as HTMLElement).style.pointerEvents = fabricPointerEvents;
  }, [fabricPointerEvents]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex-1 overflow-auto flex items-start justify-center bg-[hsl(var(--background))] p-4",
        className
      )}
    >
      {isLoading && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="h-4 w-4 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
            Loading PDF…
          </div>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <ErrorState error={loadError} />
        </div>
      )}

      <div
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center center",
          transition: "transform 0.15s ease",
        }}
      >
        {/* Stacking container — canvas and PDF are siblings so canvas mounts
            immediately (not gated by react-pdf's Document suspend). */}
        <div
          className="relative"
          style={{ width: pageSize.width, height: pageSize.height }}
        >
          {/* PDF layer */}
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            error={null}
          >
            <Page
              pageNumber={pageNumber}
              width={pageSize.width || undefined}
              onLoadSuccess={onPageLoadSuccess}
              renderTextLayer
              renderAnnotationLayer={false}
            />
          </Document>

          {/* Fabric annotation canvas — always in DOM so canvasElRef is set
              before the PDF loads and fabric init useEffect can run. */}
          <canvas
            ref={canvasElRef}
            style={{ display: "block", touchAction: "none" }}
          />

          {/* Comment pins (Velt) */}
          {commentOverlay}

          {/* Link / markup pins */}
          {linkPinsOverlay}
        </div>
      </div>

      {/* Multi-page navigation strip */}
      {numPages > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background/90 backdrop-blur rounded-full px-2 py-1 shadow-sm z-30">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={pageNumber <= 1}
            onClick={() => goToPage(pageNumber - 1)}
          >
            ‹
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums px-1">
            {pageNumber} / {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={pageNumber >= numPages}
            onClick={() => goToPage(pageNumber + 1)}
          >
            ›
          </Button>
        </div>
      )}
    </div>
  );
}
