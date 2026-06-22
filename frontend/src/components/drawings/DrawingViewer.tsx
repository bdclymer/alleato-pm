"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Home,
  AlertCircle,
  FileText,
  Grid3X3,
  MessageSquare,
  Pencil,
  Highlighter,
  Square,
  ArrowUpRight,
  Type,
  Eraser,
  Undo2,
  Trash2,
  MousePointer2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

// ─── Types ──────────────────────────────────────────────────────────────────

type AnnotationTool = "select" | "pen" | "highlighter" | "rectangle" | "arrow" | "text" | "eraser" | "comment" | "link";

interface Point { x: number; y: number }

interface Annotation {
  id: string;
  type: "pen" | "highlighter" | "rectangle" | "arrow" | "text";
  page: number;
  color: string;
  strokeWidth: number;
  // pen
  points?: Point[];
  // rectangle / arrow
  start?: Point;
  end?: Point;
  // text
  text?: string;
  position?: Point;
}

type PdfDocumentProxy = { numPages: number };
type PdfPageProxy = { originalWidth: number; originalHeight: number };

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#000000", // black
  "#ffffff", // white
];

const STROKE_WIDTHS = [1, 2, 4, 6];

// ─── Props ──────────────────────────────────────────────────────────────────

interface DrawingViewerProps {
  fileUrl: string;
  fileName?: string;
  drawingNumber?: string;
  title?: string;
  onError?: (error: Error) => void;
  onLoadSuccess?: (pdf: PdfDocumentProxy) => void;
  className?: string;
  /** Called when the comment tool is active and the user clicks the canvas. Coords are percentages 0–100. */
  onCommentClick?: (x: number, y: number, page: number) => void;
  /** Rendered inside the PDF page container (position:relative). Used to inject comment pins. */
  commentOverlay?: React.ReactNode;
  /** Additional overlay rendered inside the PDF page container. Used for link/markup pins. */
  linkPinsOverlay?: React.ReactNode;
  /** Called whenever the displayed page changes. */
  onPageChange?: (page: number) => void;
  /** Hide the built-in toolbar (used when parent owns the toolbar). Default true. */
  showToolbar?: boolean;
  /** Externally controlled annotation tool. */
  controlledTool?: AnnotationTool;
  /** Externally controlled annotation color. */
  controlledColor?: string;
  /** Externally controlled stroke width. */
  controlledStrokeWidth?: number;
  /** Called when user changes page (controlled by PDF multi-page nav). */
  onPageNumberChange?: (page: number, total: number) => void;
  /** Externally controlled zoom scale. */
  controlledScale?: number;
  /** Called when scale changes (zoom in/out via toolbar). */
  onScaleChange?: (scale: number) => void;
  /** Externally controlled rotation (0 | 90 | 180 | 270). */
  controlledRotation?: number;
  /** Called when rotation changes. */
  onRotationChange?: (rotation: number) => void;
  /** Visible annotation types for the local drawing canvas. */
  visibleAnnotationTypes?: Annotation["type"][];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2);
}

function getCanvasPoint(e: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function drawArrow(ctx: CanvasRenderingContext2D, from: Point, to: Point) {
  const headLen = 14;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - headLen * Math.cos(angle - Math.PI / 6),
    to.y - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - headLen * Math.cos(angle + Math.PI / 6),
    to.y - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function normalizeRotation(rotation: number) {
  return ((rotation % 360) + 360) % 360;
}

function renderAnnotations(
  canvas: HTMLCanvasElement,
  annotations: Annotation[],
  pageAnnotations: Annotation[],
  inProgress?: Annotation | null
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const all = inProgress ? [...pageAnnotations, inProgress] : pageAnnotations;
  for (const ann of all) {
    ctx.save();
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = ann.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if ((ann.type === "pen" || ann.type === "highlighter") && ann.points && ann.points.length > 1) {
      if (ann.type === "highlighter") {
        ctx.globalAlpha = 0.28;
      }
      ctx.beginPath();
      ctx.moveTo(ann.points[0].x, ann.points[0].y);
      for (let i = 1; i < ann.points.length; i++) {
        ctx.lineTo(ann.points[i].x, ann.points[i].y);
      }
      ctx.stroke();
    } else if (ann.type === "rectangle" && ann.start && ann.end) {
      const rx = ann.start.x;
      const ry = ann.start.y;
      const rw = ann.end.x - ann.start.x;
      const rh = ann.end.y - ann.start.y;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.globalAlpha = 1;
      ctx.strokeRect(rx, ry, rw, rh);
    } else if (ann.type === "arrow" && ann.start && ann.end) {
      drawArrow(ctx, ann.start, ann.end);
    } else if (ann.type === "text" && ann.position && ann.text) {
      const fontSize = ann.strokeWidth * 6 + 10;
      const lineHeight = Math.round(fontSize * 1.35);
      const lines = ann.text.split("\n");
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textBaseline = "top";
      // Add a soft contrast stroke so text stays legible on light/dark drawings.
      ctx.lineWidth = Math.max(1, Math.round(fontSize * 0.12));
      ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      lines.forEach((line, index) => {
        const y = ann.position!.y + index * lineHeight;
        ctx.strokeText(line, ann.position!.x, y);
        ctx.fillText(line, ann.position!.x, y);
      });
    }
    ctx.restore();
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DrawingViewer({
  fileUrl,
  fileName = "Drawing",
  drawingNumber,
  title,
  onError,
  onLoadSuccess,
  className,
  onCommentClick,
  commentOverlay,
  linkPinsOverlay,
  onPageChange,
  showToolbar = true,
  controlledTool,
  controlledColor,
  controlledStrokeWidth,
  onPageNumberChange,
  controlledScale,
  onScaleChange,
  controlledRotation,
  onRotationChange,
  visibleAnnotationTypes,
}: DrawingViewerProps) {
  // ── viewport state ──
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fitMode, setFitMode] = useState<"width" | "page" | "custom">("page");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── annotation state ──
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [annotationColor, setAnnotationColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [inProgress, setInProgress] = useState<Annotation | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInput, setTextInput] = useState<{
    pos: Point;
    value: string;
    page: number;
    annotationId?: string;
  } | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [draggingAnnotationId, setDraggingAnnotationId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point | null>(null);

  // ── refs ──
  const containerRef = useRef<HTMLDivElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfPageRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const originalPageSizeRef = useRef<{ width: number; height: number } | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const pageRenderStartRef = useRef<number | null>(null);
  const consecutiveSlowRenderCountRef = useRef(0);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const normalizedRotation = normalizeRotation(rotation);
  const slowRenderThresholdMs = 450;
  const effectiveDevicePixelRatio = useMemo(() => {
    if (typeof window === "undefined") return 1;
    return Math.min(window.devicePixelRatio || 1, 1.5);
  }, []);
  const isQuarterTurn = normalizedRotation === 90 || normalizedRotation === 270;
  const stageWidth = isQuarterTurn ? pageSize.height : pageSize.width;
  const stageHeight = isQuarterTurn ? pageSize.width : pageSize.height;

  const getTextFontSize = useCallback((stroke: number) => stroke * 6 + 10, []);

  const findTextAnnotationAtPoint = useCallback((pt: Point): Annotation | null => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const pageText = annotations
      .filter((ann) => ann.page === pageNumber && ann.type === "text" && ann.position && ann.text)
      .slice()
      .reverse();

    for (const ann of pageText) {
      const fontSize = getTextFontSize(ann.strokeWidth);
      const lineHeight = Math.round(fontSize * 1.35);
      const lines = (ann.text || "").split("\n");
      ctx.font = `${fontSize}px sans-serif`;
      const maxLineWidth = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
      const x = ann.position!.x;
      const y = ann.position!.y;
      const padX = 6;
      const padY = 4;
      const width = maxLineWidth + padX * 2;
      const height = lineHeight * lines.length + padY * 2;

      if (pt.x >= x - padX && pt.x <= x + width && pt.y >= y - padY && pt.y <= y + height) {
        return ann;
      }
    }
    return null;
  }, [annotations, getTextFontSize, pageNumber]);

  const getFitScale = useCallback(
    (pageWidth: number, pageHeight: number) => {
      const containerWidth = containerRef.current?.clientWidth ?? 800;
      const containerHeight = containerRef.current?.clientHeight ?? window.innerHeight;
      const availableHeight = Math.max(containerHeight - 32, 200);
      if (fitMode === "width") {
        return Math.min(containerWidth / pageWidth, 5);
      }
      return Math.min(containerWidth / pageWidth, availableHeight / pageHeight, 5);
    },
    [fitMode]
  );

  // ── container resize (throttled) ──
  useEffect(() => {
    const update = () => {
      if (fitMode === "custom") return;
      const original = originalPageSizeRef.current;
      if (!original) return;
      const nextScale = getFitScale(original.width, original.height);
      setScale((prev) => (Math.abs(nextScale - prev) > 0.01 ? nextScale : prev));
    };

    const scheduleUpdate = () => {
      if (resizeRafRef.current !== null) return;
      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null;
        update();
      });
    };

    update();
    const ro = new ResizeObserver(scheduleUpdate);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current);
      }
    };
  }, [fitMode, getFitScale]);

  // ── Trackpad pinch-to-zoom & scroll-wheel zoom ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // ctrlKey is set by the browser for trackpad pinch gestures
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.005;
        setScale((prev) => {
          const next = Math.min(Math.max(prev * (1 + delta), 0.1), 5);
          setFitMode("custom");
          onScaleChange?.(next);
          return next;
        });
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [onScaleChange]);

  // Sync controlled scale from parent
  useEffect(() => {
    if (controlledScale !== undefined) {
      setScale(controlledScale);
      setFitMode("custom");
    }
  }, [controlledScale]);

  // Sync controlled rotation from parent
  useEffect(() => {
    if (controlledRotation !== undefined) {
      setRotation(controlledRotation);
    }
  }, [controlledRotation]);

  // Notify parent when page changes
  useEffect(() => {
    onPageChange?.(pageNumber);
    onPageNumberChange?.(pageNumber, numPages);
  }, [pageNumber, numPages, onPageChange, onPageNumberChange]);

  // ── current page annotations ──
  const visibleAnnotationTypeSet = visibleAnnotationTypes
    ? new Set(visibleAnnotationTypes)
    : null;

  const pageAnnotations = annotations.filter(
    (a) =>
      a.page === pageNumber &&
      (!visibleAnnotationTypeSet || visibleAnnotationTypeSet.has(a.type))
  );

  const visibleInProgress =
    inProgress &&
    (!visibleAnnotationTypeSet || visibleAnnotationTypeSet.has(inProgress.type))
      ? inProgress
      : null;

  // ── re-render annotations on canvas whenever state changes ──
  useEffect(() => {
    if (typeof performance === "undefined") return;
    pageRenderStartRef.current = performance.now();
  }, [pageNumber, scale, normalizedRotation]);

  const handlePageRenderSuccess = useCallback(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof performance === "undefined") return;
    const start = pageRenderStartRef.current;
    if (start === null) return;
    const durationMs = performance.now() - start;
    if (durationMs > slowRenderThresholdMs) {
      consecutiveSlowRenderCountRef.current += 1;
      console.warn("[DrawingViewer] Slow PDF render detected", {
        durationMs: Math.round(durationMs),
        thresholdMs: slowRenderThresholdMs,
        pageNumber,
        scale: Number(scale.toFixed(2)),
        rotation: normalizedRotation,
        fitMode,
        consecutiveSlowRenders: consecutiveSlowRenderCountRef.current,
      });
      if (consecutiveSlowRenderCountRef.current >= 3) {
        console.error("[DrawingViewer] Multiple slow renders in a row. Consider reducing zoom or panel resize churn.");
      }
    } else {
      consecutiveSlowRenderCountRef.current = 0;
    }
  }, [fitMode, normalizedRotation, pageNumber, scale, slowRenderThresholdMs]);

  // ── current page annotations ──
  useEffect(() => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    renderAnnotations(canvas, annotations, pageAnnotations, visibleInProgress);
  }, [annotations, pageAnnotations, visibleInProgress, pageSize]);

  useEffect(() => {
    if (!textInput) return;
    const input = textInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [textInput]);

  // ── PDF load callbacks ──
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
    (error: Error) => {
      setLoadError(error.message);
      setIsLoading(false);
      onError?.(error);
    },
    [onError]
  );

  const onPageLoadSuccess = useCallback(
    (page: PdfPageProxy) => {
      originalPageSizeRef.current = {
        width: page.originalWidth,
        height: page.originalHeight,
      };
      const w = page.originalWidth * scale;
      const h = page.originalHeight * scale;
      setPageSize({ width: w, height: h });
      // sync canvas size
      const canvas = annotationCanvasRef.current;
      if (canvas) {
        canvas.width = w;
        canvas.height = h;
      }
      if (fitMode !== "custom") {
        const newScale = getFitScale(page.originalWidth, page.originalHeight);
        if (Math.abs(newScale - scale) > 0.01) {
          setScale(newScale);
        }
      }
    },
    [fitMode, getFitScale, scale]
  );

  // ── zoom helpers (smooth 20% steps) ──
  const zoomIn = () => {
    const next = Math.min(scale * 1.2, 5);
    setScale(next);
    setFitMode("custom");
    onScaleChange?.(next);
  };
  const zoomOut = () => {
    const next = Math.max(scale / 1.2, 0.1);
    setScale(next);
    setFitMode("custom");
    onScaleChange?.(next);
  };
  const rotateRight = () => {
    const next = (rotation + 90) % 360;
    setRotation(next);
    onRotationChange?.(next);
  };
  const rotateLeft = () => {
    const next = normalizeRotation(rotation - 90);
    setRotation(next);
    onRotationChange?.(next);
  };
  const resetView = () => {
    const containerWidth = containerRef.current?.clientWidth ?? 800;
    const s = containerWidth / 800;
    setScale(s);
    setRotation(0);
    setFitMode("width");
    onScaleChange?.(s);
    onRotationChange?.(0);
  };
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // ── annotation: eraser helper ──
  const eraseAtPoint = (pt: Point) => {
    setAnnotations((prev) =>
      prev.filter((ann) => {
        if (ann.page !== pageNumber) return true;
        if (ann.points) {
          return !ann.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 16);
        }
        if (ann.start && ann.end) {
          const midX = (ann.start.x + ann.end.x) / 2;
          const midY = (ann.start.y + ann.end.y) / 2;
          return Math.hypot(midX - pt.x, midY - pt.y) > 30;
        }
        if (ann.position) {
          return Math.hypot(ann.position.x - pt.x, ann.position.y - pt.y) > 30;
        }
        return true;
      })
    );
  };

  // ── annotation: canvas mouse handlers ──
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const pt = getCanvasPoint(e, canvas);

    if (resolvedTool === "select") {
      const textAnn = findTextAnnotationAtPoint(pt);
      if (textAnn?.position) {
        setSelectedAnnotationId(textAnn.id);
        setDraggingAnnotationId(textAnn.id);
        setDragOffset({
          x: pt.x - textAnn.position.x,
          y: pt.y - textAnn.position.y,
        });
      } else {
        setSelectedAnnotationId(null);
      }
      return;
    }

    if (resolvedTool === "comment" || resolvedTool === "link") {
      const xPct = (pt.x / canvas.width) * 100;
      const yPct = (pt.y / canvas.height) * 100;
      onCommentClick?.(xPct, yPct, pageNumber);
      return;
    }

    if (resolvedTool === "text") {
      const textAnn = findTextAnnotationAtPoint(pt);
      if (textAnn?.position) {
        setTextInput({
          pos: textAnn.position,
          value: textAnn.text || "",
          page: textAnn.page,
          annotationId: textAnn.id,
        });
        setSelectedAnnotationId(textAnn.id);
        return;
      }
      setSelectedAnnotationId(null);
      setTextInput({ pos: pt, value: "", page: pageNumber });
      return;
    }

    if (resolvedTool === "eraser") {
      eraseAtPoint(pt);
      setIsDrawing(true);
      return;
    }

    setIsDrawing(true);
    if (resolvedTool === "pen" || resolvedTool === "highlighter") {
      setInProgress({
        id: uid(),
        type: resolvedTool,
        page: pageNumber,
        color: resolvedColor,
        strokeWidth: resolvedTool === "highlighter" ? Math.max(resolvedStrokeWidth * 4, 10) : resolvedStrokeWidth,
        points: [pt],
      });
    } else {
      setInProgress({
        id: uid(),
        type: resolvedTool as "rectangle" | "arrow",
        page: pageNumber,
        color: resolvedColor,
        strokeWidth: resolvedStrokeWidth,
        start: pt,
        end: pt,
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const pt = getCanvasPoint(e, canvas);

    if (draggingAnnotationId && resolvedTool === "select") {
      setAnnotations((prev) =>
        prev.map((ann) => {
          if (ann.id !== draggingAnnotationId || ann.type !== "text" || !ann.position || !dragOffset) {
            return ann;
          }
          return {
            ...ann,
            position: {
              x: pt.x - dragOffset.x,
              y: pt.y - dragOffset.y,
            },
          };
        })
      );
      return;
    }

    if (!isDrawing) return;

    if (resolvedTool === "eraser") {
      eraseAtPoint(pt);
      return;
    }

    if (!inProgress) return;
    if (inProgress.type === "pen" || inProgress.type === "highlighter") {
      setInProgress((prev) =>
        prev ? { ...prev, points: [...(prev.points ?? []), pt] } : prev
      );
    } else {
      setInProgress((prev) => (prev ? { ...prev, end: pt } : prev));
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingAnnotationId) {
      setDraggingAnnotationId(null);
      setDragOffset(null);
      return;
    }
    if (!isDrawing) return;
    setIsDrawing(false);
    if (resolvedTool === "eraser") return;
    if (!inProgress) return;
    setAnnotations((prev) => [...prev, inProgress]);
    setInProgress(null);
  };

  const commitText = () => {
    if (!textInput?.value.trim()) {
      setSelectedAnnotationId(null);
      setTextInput(null);
      return;
    }
    setAnnotations((prev) => {
      if (textInput.annotationId) {
        return prev.map((ann) =>
          ann.id === textInput.annotationId
            ? {
                ...ann,
                color: resolvedColor,
                strokeWidth: Math.max(resolvedStrokeWidth, 2),
                text: textInput.value.trim(),
              }
            : ann
        );
      }

      return [
        ...prev,
        {
          id: uid(),
          type: "text",
          page: textInput.page,
          color: resolvedColor,
          strokeWidth: Math.max(resolvedStrokeWidth, 2),
          text: textInput.value.trim(),
          position: textInput.pos,
        },
      ];
    });
    setSelectedAnnotationId(textInput.annotationId ?? null);
    setTextInput(null);
  };

  const undo = () => {
    setAnnotations((prev) => {
      const last = [...prev].reverse().findIndex((a) => a.page === pageNumber);
      if (last === -1) return prev;
      const idx = prev.length - 1 - last;
      return prev.filter((_, i) => i !== idx);
    });
  };

  const clearPage = () => {
    setAnnotations((prev) => prev.filter((a) => a.page !== pageNumber));
  };

  // ── controlled vs local values ──
  const resolvedTool = controlledTool ?? activeTool;
  const resolvedColor = controlledColor ?? annotationColor;
  const resolvedStrokeWidth = controlledStrokeWidth ?? strokeWidth;

  const annotationMode = resolvedTool !== "select" && resolvedTool !== "comment" && resolvedTool !== "link";

  // ── canvas cursor ──
  const canvasCursor =
    resolvedTool === "select"
      ? draggingAnnotationId
        ? "grabbing"
        : selectedAnnotationId
          ? "grab"
          : "default"
      : resolvedTool === "comment" || resolvedTool === "link"
      ? "crosshair"
      : resolvedTool === "eraser"
      ? "cell"
      : resolvedTool === "text"
      ? textInput ? "default" : "text"
      : "crosshair";

  if (loadError) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center h-96 bg-muted/30 rounded-lg",
          className
        )}
      >
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        {/* eslint-disable-next-line design-system/no-raw-heading */}
        <h3 className="text-lg font-semibold mb-2">Failed to load PDF</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn(
          "flex flex-col h-full bg-background overflow-hidden",
          showToolbar && "border rounded-lg",
          isFullscreen && "fixed inset-0 z-50 rounded-none",
          className
        )}
      >
        {/* ── Main toolbar ─────────────────────────────────────────────────── */}
        {showToolbar && <div className="flex items-center gap-2 px-3 py-2 border-b bg-card flex-wrap">
          {/* Page nav */}
          {numPages > 1 && (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={pageNumber === 1}>
                    <ChevronLeft />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous page</TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-1 text-sm">
                <Input
                  type="number"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(Math.max(1, Math.min(numPages, Number(e.target.value) || 1)))}
                  className="w-12 h-7 text-xs text-center"
                  min={1}
                  max={numPages}
                />
                <span className="text-muted-foreground text-xs">/ {numPages}</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))} disabled={pageNumber === numPages}>
                    <ChevronRight />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next page</TooltipContent>
              </Tooltip>
              <div className="w-px h-5 bg-border mx-1" />
            </div>
          )}

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={zoomOut}><ZoomOut className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Zoom out</TooltipContent>
            </Tooltip>
            <Input
              type="number"
              value={Math.round(scale * 100)}
              onChange={(e) => { setScale((Number(e.target.value) || 100) / 100); setFitMode("custom"); }}
              className="w-16 h-7 text-xs text-center"
              min={10} max={500}
            />
            <span className="text-xs text-muted-foreground">%</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={zoomIn}><ZoomIn className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>
          </div>

          {/* Fit / rotate / home / fullscreen */}
          <div className="flex items-center gap-1">
            <div className="w-px h-5 bg-border mx-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={fitMode === "width" ? "secondary" : "ghost"} size="sm" onClick={() => { setFitMode("width"); }}>
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fit width</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={rotateLeft}>
                  <RotateCcw />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rotate left</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={rotateRight}>
                  <RotateCw />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rotate right</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={resetView}><Home className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Reset view</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</TooltipContent>
            </Tooltip>
          </div>

          {/* ── Annotation toolbar ───────────────────────────────────────── */}
          <div className="w-px h-5 bg-border mx-1" />
          <div className="flex items-center gap-1">
            {(
              [
                { tool: "select" as AnnotationTool, icon: <MousePointer2 className="h-4 w-4" />, label: "Select" },
                { tool: "pen" as AnnotationTool, icon: <Pencil className="h-4 w-4" />, label: "Pen" },
                { tool: "highlighter" as AnnotationTool, icon: <Highlighter className="h-4 w-4" />, label: "Highlighter" },
                { tool: "rectangle" as AnnotationTool, icon: <Square className="h-4 w-4" />, label: "Rectangle" },
                { tool: "arrow" as AnnotationTool, icon: <ArrowUpRight className="h-4 w-4" />, label: "Arrow" },
                { tool: "text" as AnnotationTool, icon: <Type className="h-4 w-4" />, label: "Text" },
                { tool: "eraser" as AnnotationTool, icon: <Eraser className="h-4 w-4" />, label: "Eraser" },
                { tool: "comment" as AnnotationTool, icon: <MessageSquare className="h-4 w-4" />, label: "Comment" },
              ] as { tool: AnnotationTool; icon: React.ReactNode; label: string }[]
            ).map(({ tool, icon, label }) => (
              <Tooltip key={tool}>
                <TooltipTrigger asChild>
                  <Button
                    variant={resolvedTool === tool ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTool(tool)}
                  >
                    {icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Color swatches */}
          {annotationMode && (
            <div className="flex items-center gap-1 ml-1">
              {PRESET_COLORS.map((c) => (
                <Button
                  key={c}
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAnnotationColor(c)}
                  className={cn(
                    "h-5 w-5 rounded-full border-2 p-0 transition-transform",
                    annotationColor === c
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-110"
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          )}

          {/* Stroke width */}
          {annotationMode && resolvedTool !== "text" && resolvedTool !== "eraser" && (
            <div className="flex items-center gap-1 ml-1">
              {STROKE_WIDTHS.map((w) => (
                <Button
                  key={w}
                  type="button"
                  variant={strokeWidth === w ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setStrokeWidth(w)}
                  className="h-6 w-6"
                  title={`${w}px`}
                >
                  <div
                    className="rounded-full bg-foreground"
                    style={{ width: w + 2, height: w + 2 }}
                  />
                </Button>
              ))}
            </div>
          )}

          {/* Undo / clear */}
          {annotations.some((a) => a.page === pageNumber) && (
            <div className="flex items-center gap-1 ml-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={undo}><Undo2 className="h-4 w-4" /></Button>
                </TooltipTrigger>
                <TooltipContent>Undo last</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={clearPage}><Trash2 className="h-4 w-4" /></Button>
                </TooltipTrigger>
                <TooltipContent>Clear page annotations</TooltipContent>
              </Tooltip>
            </div>
          )}

          {annotationMode && (
            <Badge variant="outline" className="ml-1 text-xs capitalize">{resolvedTool}</Badge>
          )}
        </div>}

        {/* ── PDF + annotation canvas ──────────────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-4">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading PDF…</span>
              </div>
            </div>
          )}

          <div
            ref={pdfPageRef}
            className="relative shadow-sm"
            style={{
              display: "inline-block",
              width: stageWidth || undefined,
              height: stageHeight || undefined,
            }}
          >
            <div
              className="absolute left-1/2 top-1/2 origin-center relative"
              style={{
                width: pageSize.width || undefined,
                height: pageSize.height || undefined,
                transform: `translate(-50%, -50%) rotate(${normalizedRotation}deg)`,
              }}
            >
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading=""
                error=""
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  onLoadSuccess={onPageLoadSuccess}
                  onRenderSuccess={handlePageRenderSuccess}
                  renderMode="canvas"
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  devicePixelRatio={effectiveDevicePixelRatio}
                />
              </Document>

              {/* Annotation canvas overlay */}
              <canvas
                ref={annotationCanvasRef}
                width={pageSize.width}
                height={pageSize.height}
                className="absolute inset-0 z-10 w-full h-full"
                style={{ cursor: canvasCursor, touchAction: "none", pointerEvents: textInput ? "none" : "auto" }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onClick={(e) => {
                  if (resolvedTool !== "text" || textInput) return;
                  const canvas = annotationCanvasRef.current;
                  if (!canvas) return;
                  const pt = getCanvasPoint(e, canvas);
                  const textAnn = findTextAnnotationAtPoint(pt);
                  if (textAnn?.position) {
                    setTextInput({
                      pos: textAnn.position,
                      value: textAnn.text || "",
                      page: textAnn.page,
                      annotationId: textAnn.id,
                    });
                    setSelectedAnnotationId(textAnn.id);
                    return;
                  }
                  setSelectedAnnotationId(null);
                  setTextInput({ pos: pt, value: "", page: pageNumber });
                }}
                onDoubleClick={(e) => {
                  const canvas = annotationCanvasRef.current;
                  if (!canvas) return;
                  const pt = getCanvasPoint(e, canvas);
                  const textAnn = findTextAnnotationAtPoint(pt);
                  if (!textAnn?.position) return;
                  setTextInput({
                    pos: textAnn.position,
                    value: textAnn.text || "",
                    page: textAnn.page,
                    annotationId: textAnn.id,
                  });
                  setSelectedAnnotationId(textAnn.id);
                }}
              />

              {/* Floating text input */}
              {textInput && (
                <div
                  className="absolute z-20"
                  style={{ left: textInput.pos.x, top: textInput.pos.y - 28 }}
                >
                  <div className="rounded-md border border-border bg-background/95 shadow-sm p-1.5 min-w-52">
                    <Textarea
                    ref={textInputRef}
                    value={textInput.value}
                    onChange={(e) => setTextInput((t) => t ? { ...t, value: e.target.value } : t)}
                    onBlur={commitText}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        commitText();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setTextInput(null);
                      }
                    }}
                    className="w-full resize-none border border-border bg-background/90 px-2 py-1.5 text-sm rounded outline-none min-h-16"
                    placeholder="Type text…"
                    style={{ color: resolvedColor }}
                  />
                    <div className="mt-1.5 flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setTextInput(null)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-6 px-2"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={commitText}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Comment pins overlay */}
              {commentOverlay}

              {/* Link/markup pins overlay */}
              {linkPinsOverlay}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
