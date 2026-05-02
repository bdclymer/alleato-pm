"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { pdfjs } from "react-pdf";
import OpenSeadragon from "openseadragon";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Highlighter,
  Home,
  Maximize2,
  MessageSquare,
  MousePointer2,
  Pencil,
  Square,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ErrorState } from "@/components/ds";
import { cn } from "@/lib/utils";

type PdfDocumentProxy = Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>;
type PdfLoadingTask = ReturnType<typeof pdfjs.getDocument>;

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

const TARGET_LONGEST_SIDE_PX = 6000;

// ─── Annotation types ───────────────────────────────────────────────────────

export type AnnotationTool =
  | "select"
  | "pen"
  | "highlighter"
  | "rectangle"
  | "arrow"
  | "text"
  | "eraser"
  | "comment"
  | "link";

export type LocalAnnotationType = "pen" | "highlighter" | "rectangle" | "arrow" | "text";

interface ImagePoint {
  x: number;
  y: number;
}

interface Annotation {
  id: string;
  type: LocalAnnotationType;
  page: number;
  color: string;
  strokeWidth: number;
  points?: ImagePoint[];
  start?: ImagePoint;
  end?: ImagePoint;
  text?: string;
  position?: ImagePoint;
}

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#000000",
  "#ffffff",
];

const STROKE_WIDTHS = [1, 2, 4, 6];

function uid() {
  return Math.random().toString(36).slice(2);
}

// ─── Public overlay type ────────────────────────────────────────────────────

export interface HtmlOverlay {
  id: string;
  /** 0–100, percentage across the rendered page. */
  xPct: number;
  /** 0–100, percentage down the rendered page. */
  yPct: number;
  page: number;
  element: React.ReactNode;
  /** Where the rendered element anchors relative to the (xPct, yPct) point. */
  placement?: "BOTTOM" | "TOP" | "CENTER" | "LEFT" | "RIGHT" | "TOP_LEFT" | "TOP_RIGHT" | "BOTTOM_LEFT" | "BOTTOM_RIGHT";
  /** Stacking order; higher renders on top. Defaults to 20. */
  zIndex?: number;
}

// ─── Component props ────────────────────────────────────────────────────────

export interface OsdDrawingViewerProps {
  fileUrl: string;
  className?: string;

  /** Hide the built-in toolbar (parent owns the toolbar). Defaults to true. */
  showToolbar?: boolean;

  /** Controlled tool — when set, overrides internal state. */
  controlledTool?: AnnotationTool;
  /** Controlled paint color for drawing tools. */
  controlledColor?: string;
  /** Controlled stroke width for drawing tools. */
  controlledStrokeWidth?: number;

  /** Controlled zoom scale (relative to fit-to-page = 1.0). */
  controlledScale?: number;
  onScaleChange?: (scale: number) => void;
  /** Controlled rotation in degrees (0, 90, 180, 270). */
  controlledRotation?: number;
  onRotationChange?: (rotation: number) => void;

  /** Notified whenever the visible page changes. */
  onPageNumberChange?: (page: number, total: number) => void;

  /** Called when the user clicks while the comment or link tool is active. Coords are 0–100. */
  onCommentClick?: (xPct: number, yPct: number, page: number) => void;

  /** Pins / threads to render on top of the drawing in image-space. */
  htmlOverlays?: HtmlOverlay[];

  /** Filter local (drawn) markup by type. Undefined = show all. */
  visibleAnnotationTypes?: LocalAnnotationType[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OsdDrawingViewer({
  fileUrl,
  className,
  showToolbar = true,
  controlledTool,
  controlledColor,
  controlledStrokeWidth,
  controlledScale,
  onScaleChange,
  controlledRotation,
  onRotationChange,
  onPageNumberChange,
  onCommentClick,
  htmlOverlays,
  visibleAnnotationTypes,
}: OsdDrawingViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const renderTokenRef = useRef(0);

  const [pdf, setPdf] = useState<PdfDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [isRendering, setIsRendering] = useState(true);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  // Local (uncontrolled) tool state — fallback when no controlledTool is provided.
  const [localTool, setLocalTool] = useState<AnnotationTool>("select");
  const [localColor, setLocalColor] = useState("#ef4444");
  const [localStrokeWidth, setLocalStrokeWidth] = useState(2);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const tool = controlledTool ?? localTool;
  const color = controlledColor ?? localColor;
  const strokeWidth = controlledStrokeWidth ?? localStrokeWidth;

  // ── Load PDF ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let loadingTask: PdfLoadingTask | null = null;
    setError(null);
    (async () => {
      try {
        loadingTask = pdfjs.getDocument({ url: fileUrl });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
        setPageNumber(1);
        setAnnotations([]);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load PDF");
      }
    })();
    return () => {
      cancelled = true;
      try {
        loadingTask?.destroy?.();
      } catch {
        // ignore
      }
    };
  }, [fileUrl]);

  // ── Notify parent of page/total changes ──────────────────────────────────
  useEffect(() => {
    onPageNumberChange?.(pageNumber, numPages);
  }, [pageNumber, numPages, onPageNumberChange]);

  // ── Render current page → blob URL → OSD ─────────────────────────────────
  useEffect(() => {
    if (!pdf) return;
    const myToken = ++renderTokenRef.current;
    const isCancelled = () => myToken !== renderTokenRef.current;
    setIsRendering(true);
    setRenderMs(null);
    setError(null);

    (async () => {
      const t0 = performance.now();
      try {
        const page = await pdf.getPage(pageNumber);
        if (isCancelled()) return;

        const base = page.getViewport({ scale: 1 });
        const longest = Math.max(base.width, base.height);
        const scale = Math.min(TARGET_LONGEST_SIDE_PX / longest, 4);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No 2D context");

        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (isCancelled()) return;

        const blob: Blob = await new Promise((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
            "image/png"
          )
        );
        if (isCancelled()) return;

        const url = URL.createObjectURL(blob);
        const previousUrl = blobUrlRef.current;
        blobUrlRef.current = url;

        if (!viewerRef.current && containerRef.current) {
          viewerRef.current = OpenSeadragon({
            element: containerRef.current,
            prefixUrl: "/openseadragon-images/",
            tileSources: { type: "image", url },
            showNavigationControl: false,
            gestureSettingsMouse: {
              scrollToZoom: true,
              clickToZoom: false,
              dblClickToZoom: true,
              dragToPan: true,
            },
            gestureSettingsTouch: {
              pinchToZoom: true,
              scrollToZoom: false,
              dragToPan: true,
            },
            animationTime: 0.4,
            blendTime: 0.15,
            springStiffness: 8.5,
            constrainDuringPan: true,
            visibilityRatio: 1,
            minZoomImageRatio: 0.5,
            maxZoomPixelRatio: 5,
            zoomPerScroll: 1.2,
            preserveImageSizeOnResize: true,
          });
        } else if (viewerRef.current) {
          viewerRef.current.open({ type: "image", url });
        }

        setImageSize({ width: canvas.width, height: canvas.height });

        if (previousUrl) {
          setTimeout(() => URL.revokeObjectURL(previousUrl), 1000);
        }
        setRenderMs(Math.round(performance.now() - t0));
      } catch (e: unknown) {
        if (!isCancelled()) setError(e instanceof Error ? e.message : "Failed to render page");
      } finally {
        if (!isCancelled()) setIsRendering(false);
      }
    })();
  }, [pdf, pageNumber]);

  // ── Toggle OSD mouse nav based on active tool ────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.setMouseNavEnabled(tool === "select");
  }, [tool, imageSize]);

  // ── Emit OSD zoom changes back to parent ─────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !onScaleChange) return;
    const handler = () => {
      const home = viewer.viewport.getHomeZoom();
      const cur = viewer.viewport.getZoom(true);
      if (home > 0) onScaleChange(cur / home);
    };
    viewer.addHandler("zoom", handler);
    return () => {
      viewer.removeHandler("zoom", handler);
    };
  }, [onScaleChange, imageSize]);

  // ── Apply controlledScale ────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || controlledScale === undefined) return;
    const home = viewer.viewport.getHomeZoom();
    if (home <= 0) return;
    const target = home * controlledScale;
    const current = viewer.viewport.getZoom(true);
    if (Math.abs(current - target) / target > 0.01) {
      viewer.viewport.zoomTo(target);
    }
  }, [controlledScale, imageSize]);

  // ── Apply controlledRotation ─────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || controlledRotation === undefined) return;
    if (typeof viewer.viewport.setRotation === "function") {
      viewer.viewport.setRotation(controlledRotation);
    }
  }, [controlledRotation, imageSize]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      try {
        viewerRef.current?.destroy();
      } catch {
        // ignore
      }
      viewerRef.current = null;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const zoomIn = () => {
    viewerRef.current?.viewport.zoomBy(1.4);
  };
  const zoomOut = () => {
    viewerRef.current?.viewport.zoomBy(1 / 1.4);
  };
  const home = () => viewerRef.current?.viewport.goHome();
  const fullscreen = () => viewerRef.current?.setFullScreen(true);

  const undo = () => {
    setAnnotations((prev) => {
      const lastIdx = [...prev].map((a, i) => ({ a, i })).reverse().find((x) => x.a.page === pageNumber)?.i;
      if (lastIdx === undefined) return prev;
      return prev.filter((_, i) => i !== lastIdx);
    });
  };

  const clearPage = () => {
    setAnnotations((prev) => prev.filter((a) => a.page !== pageNumber));
  };

  const visibleAnnotationsOnPage = useMemo(() => {
    const filterTypes = visibleAnnotationTypes
      ? new Set<LocalAnnotationType>(visibleAnnotationTypes)
      : null;
    return annotations.filter(
      (a) => a.page === pageNumber && (!filterTypes || filterTypes.has(a.type))
    );
  }, [annotations, pageNumber, visibleAnnotationTypes]);

  if (error) {
    return (
      <div className={cn("flex h-full items-center justify-center bg-muted/30", className)}>
        <ErrorState title="Failed to load drawing" error={error} />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col h-full bg-background", className)}>
        {showToolbar && (
          <div className="flex items-center gap-1 px-3 py-2 border-b bg-card flex-wrap">
            {numPages > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={pageNumber === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums px-1">
                  {pageNumber} / {numPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                  disabled={pageNumber === numPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
              </>
            )}
            <Button variant="ghost" size="sm" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={home}>
              <Home className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            {(
              [
                { value: "select" as AnnotationTool, icon: <MousePointer2 className="h-4 w-4" />, label: "Select / pan" },
                { value: "pen" as AnnotationTool, icon: <Pencil className="h-4 w-4" />, label: "Pen" },
                { value: "highlighter" as AnnotationTool, icon: <Highlighter className="h-4 w-4" />, label: "Highlighter" },
                { value: "rectangle" as AnnotationTool, icon: <Square className="h-4 w-4" />, label: "Rectangle" },
                { value: "arrow" as AnnotationTool, icon: <ArrowUpRight className="h-4 w-4" />, label: "Arrow" },
                { value: "text" as AnnotationTool, icon: <Type className="h-4 w-4" />, label: "Text" },
                { value: "eraser" as AnnotationTool, icon: <Eraser className="h-4 w-4" />, label: "Eraser" },
                { value: "comment" as AnnotationTool, icon: <MessageSquare className="h-4 w-4" />, label: "Comment" },
              ] as const
            ).map(({ value, icon, label }) => (
              <Tooltip key={value}>
                <TooltipTrigger asChild>
                  <Button
                    variant={tool === value ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setLocalTool(value)}
                  >
                    {icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
            {tool !== "select" && tool !== "eraser" && tool !== "comment" && tool !== "link" && (
              <div className="flex items-center gap-1 ml-1">
                {PRESET_COLORS.map((c) => (
                  <Button
                    key={c}
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Color ${c}`}
                    onClick={() => setLocalColor(c)}
                    className={cn(
                      "h-5 w-5 rounded-full border-2 p-0 transition-transform",
                      color === c
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-110"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
            {tool !== "select" && tool !== "eraser" && tool !== "text" && tool !== "comment" && tool !== "link" && (
              <div className="flex items-center gap-1 ml-1">
                {STROKE_WIDTHS.map((w) => (
                  <Button
                    key={w}
                    variant={strokeWidth === w ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setLocalStrokeWidth(w)}
                    className="h-6 w-6"
                    aria-label={`Stroke ${w}px`}
                  >
                    <span
                      className="rounded-full bg-foreground"
                      style={{ width: w + 2, height: w + 2 }}
                    />
                  </Button>
                ))}
              </div>
            )}
            {visibleAnnotationsOnPage.length > 0 && (
              <>
                <div className="w-px h-5 bg-border mx-1" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={undo}>
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo last on this page</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={clearPage}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear all on this page</TooltipContent>
                </Tooltip>
              </>
            )}
            <div className="ml-auto flex items-center gap-3">
              {renderMs !== null && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  rendered in {renderMs}ms
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={fullscreen}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="relative flex-1 bg-muted/30">
          {isRendering && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 pointer-events-none">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div ref={containerRef} className="absolute inset-0" />

          {imageSize && (
            <AnnotationOverlay
              viewerRef={viewerRef}
              imageWidth={imageSize.width}
              imageHeight={imageSize.height}
              tool={tool}
              color={color}
              strokeWidth={strokeWidth}
              page={pageNumber}
              annotations={visibleAnnotationsOnPage}
              onCommit={(ann) => setAnnotations((prev) => [...prev, ann])}
              onErase={(id) => setAnnotations((prev) => prev.filter((a) => a.id !== id))}
              onCommentClick={onCommentClick}
            />
          )}

          {imageSize &&
            (htmlOverlays ?? [])
              .filter((o) => o.page === pageNumber)
              .map((overlay) => (
                <OsdHtmlOverlayItem
                  key={overlay.id}
                  viewerRef={viewerRef}
                  overlay={overlay}
                  imageWidth={imageSize.width}
                  imageHeight={imageSize.height}
                />
              ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── HTML overlay item — one per pin/thread ─────────────────────────────────

function OsdHtmlOverlayItem({
  viewerRef,
  overlay,
  imageWidth,
  imageHeight,
}: {
  viewerRef: React.MutableRefObject<OpenSeadragon.Viewer | null>;
  overlay: HtmlOverlay;
  imageWidth: number;
  imageHeight: number;
}) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewer = viewerRef.current;
    const el = elRef.current;
    if (!viewer || !el) return;
    const placement =
      OpenSeadragon.Placement[overlay.placement ?? "BOTTOM"] ?? OpenSeadragon.Placement.BOTTOM;
    const point = new OpenSeadragon.Point(
      (overlay.xPct / 100) * imageWidth,
      (overlay.yPct / 100) * imageHeight
    );
    try {
      viewer.addOverlay({
        element: el,
        location: viewer.viewport.imageToViewportCoordinates(point),
        placement,
      });
    } catch {
      // ignore — viewer may not yet be ready
    }
    return () => {
      try {
        viewer.removeOverlay(el);
      } catch {
        // ignore
      }
    };
  }, [viewerRef, overlay.xPct, overlay.yPct, overlay.placement, imageWidth, imageHeight]);

  return (
    <div ref={elRef} style={{ zIndex: overlay.zIndex ?? 20, pointerEvents: "auto" }}>
      {overlay.element}
    </div>
  );
}

// ─── Annotation overlay (SVG drawing layer) ─────────────────────────────────

interface OverlayProps {
  viewerRef: React.MutableRefObject<OpenSeadragon.Viewer | null>;
  imageWidth: number;
  imageHeight: number;
  tool: AnnotationTool;
  color: string;
  strokeWidth: number;
  page: number;
  annotations: Annotation[];
  onCommit: (annotation: Annotation) => void;
  onErase: (id: string) => void;
  onCommentClick?: (xPct: number, yPct: number, page: number) => void;
}

function AnnotationOverlay({
  viewerRef,
  imageWidth,
  imageHeight,
  tool,
  color,
  strokeWidth,
  page,
  annotations,
  onCommit,
  onErase,
  onCommentClick,
}: OverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState(`0 0 ${imageWidth} ${imageHeight}`);
  const [inProgress, setInProgress] = useState<Annotation | null>(null);
  const [textPrompt, setTextPrompt] = useState<{ position: ImagePoint } | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const sync = () => {
      const vp = viewer.viewport;
      if (!vp) return;
      const bounds = vp.getBounds(true);
      const tl = vp.viewportToImageCoordinates(
        new OpenSeadragon.Point(bounds.x, bounds.y)
      );
      const br = vp.viewportToImageCoordinates(
        new OpenSeadragon.Point(bounds.x + bounds.width, bounds.y + bounds.height)
      );
      setViewBox(`${tl.x} ${tl.y} ${br.x - tl.x} ${br.y - tl.y}`);
    };

    sync();
    viewer.addHandler("update-viewport", sync);
    viewer.addHandler("animation", sync);
    viewer.addHandler("resize", sync);
    return () => {
      viewer.removeHandler("update-viewport", sync);
      viewer.removeHandler("animation", sync);
      viewer.removeHandler("resize", sync);
    };
  }, [viewerRef, imageWidth, imageHeight]);

  const toImagePoint = useCallback(
    (e: ReactPointerEvent | PointerEvent): ImagePoint | null => {
      const viewer = viewerRef.current;
      if (!viewer) return null;
      const rect = (viewer.element as HTMLElement).getBoundingClientRect();
      const local = new OpenSeadragon.Point(e.clientX - rect.left, e.clientY - rect.top);
      const img = viewer.viewport.viewerElementToImageCoordinates(local);
      return { x: img.x, y: img.y };
    },
    [viewerRef]
  );

  const handlePointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (tool === "select") return;
    const pt = toImagePoint(e);
    if (!pt) return;

    if (tool === "comment" || tool === "link") {
      // Emit percentage coords so parent can persist them in the same shape v1 used.
      const xPct = (pt.x / imageWidth) * 100;
      const yPct = (pt.y / imageHeight) * 100;
      onCommentClick?.(xPct, yPct, page);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);

    if (tool === "text") {
      setTextPrompt({ position: pt });
      return;
    }

    if (tool === "eraser") {
      const hit = findAnnotationAt(annotations, pt);
      if (hit) onErase(hit.id);
      drawingRef.current = true;
      return;
    }

    drawingRef.current = true;
    if (tool === "pen" || tool === "highlighter") {
      setInProgress({
        id: uid(),
        type: tool,
        page,
        color,
        strokeWidth: tool === "highlighter" ? Math.max(strokeWidth * 6, 12) : strokeWidth,
        points: [pt],
      });
    } else {
      setInProgress({
        id: uid(),
        type: tool,
        page,
        color,
        strokeWidth,
        start: pt,
        end: pt,
      });
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drawingRef.current) return;
    const pt = toImagePoint(e);
    if (!pt) return;

    if (tool === "eraser") {
      const hit = findAnnotationAt(annotations, pt);
      if (hit) onErase(hit.id);
      return;
    }

    setInProgress((prev) => {
      if (!prev) return prev;
      if (prev.type === "pen" || prev.type === "highlighter") {
        return { ...prev, points: [...(prev.points ?? []), pt] };
      }
      return { ...prev, end: pt };
    });
  };

  const handlePointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (inProgress) {
      onCommit(inProgress);
      setInProgress(null);
    }
  };

  const overlayStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: tool === "select" ? "none" : "auto",
    cursor:
      tool === "select"
        ? "default"
        : tool === "eraser"
          ? "cell"
          : tool === "text"
            ? "text"
            : tool === "comment" || tool === "link"
              ? "crosshair"
              : "crosshair",
    touchAction: "none",
  };

  const textPromptStyle: CSSProperties | undefined = textPrompt
    ? (() => {
        const viewer = viewerRef.current;
        if (!viewer) return undefined;
        const elPt = viewer.viewport.imageToViewerElementCoordinates(
          new OpenSeadragon.Point(textPrompt.position.x, textPrompt.position.y)
        );
        return {
          position: "absolute",
          left: elPt.x,
          top: elPt.y,
          transform: "translate(0, -2.25rem)",
          zIndex: 30,
        };
      })()
    : undefined;

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={viewBox}
        preserveAspectRatio="none"
        style={overlayStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {annotations.map((a) => (
          <AnnotationShape key={a.id} annotation={a} />
        ))}
        {inProgress && <AnnotationShape annotation={inProgress} />}
      </svg>

      {textPrompt && (
        <div style={textPromptStyle}>
          <Input
            autoFocus
            type="text"
            placeholder="Type text…"
            className="h-8 w-48 text-sm shadow-sm"
            style={{ color }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = (e.target as HTMLInputElement).value.trim();
                if (value) {
                  onCommit({
                    id: uid(),
                    type: "text",
                    page,
                    color,
                    strokeWidth: Math.max(strokeWidth, 2),
                    text: value,
                    position: textPrompt.position,
                  });
                }
                setTextPrompt(null);
              } else if (e.key === "Escape") {
                setTextPrompt(null);
              }
            }}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value) {
                onCommit({
                  id: uid(),
                  type: "text",
                  page,
                  color,
                  strokeWidth: Math.max(strokeWidth, 2),
                  text: value,
                  position: textPrompt.position,
                });
              }
              setTextPrompt(null);
            }}
          />
        </div>
      )}
    </>
  );
}

// ─── Annotation rendering ───────────────────────────────────────────────────

function AnnotationShape({ annotation: a }: { annotation: Annotation }) {
  const stroke = a.color;
  const sw = a.strokeWidth;
  const ns = "non-scaling-stroke" as const;

  if ((a.type === "pen" || a.type === "highlighter") && a.points && a.points.length > 0) {
    const d = a.points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
      .join(" ");
    return (
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={a.type === "highlighter" ? 0.35 : 1}
        vectorEffect={ns}
      />
    );
  }

  if (a.type === "rectangle" && a.start && a.end) {
    const x = Math.min(a.start.x, a.end.x);
    const y = Math.min(a.start.y, a.end.y);
    const w = Math.abs(a.end.x - a.start.x);
    const h = Math.abs(a.end.y - a.start.y);
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={stroke} fillOpacity={0.18} />
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          vectorEffect={ns}
        />
      </g>
    );
  }

  if (a.type === "arrow" && a.start && a.end) {
    const dx = a.end.x - a.start.x;
    const dy = a.end.y - a.start.y;
    const len = Math.hypot(dx, dy) || 1;
    const headLen = Math.max(len * 0.15, sw * 8);
    const angle = Math.atan2(dy, dx);
    const hx1 = a.end.x - headLen * Math.cos(angle - Math.PI / 6);
    const hy1 = a.end.y - headLen * Math.sin(angle - Math.PI / 6);
    const hx2 = a.end.x - headLen * Math.cos(angle + Math.PI / 6);
    const hy2 = a.end.y - headLen * Math.sin(angle + Math.PI / 6);
    return (
      <g stroke={stroke} strokeWidth={sw} strokeLinecap="round" fill="none" vectorEffect={ns}>
        <line x1={a.start.x} y1={a.start.y} x2={a.end.x} y2={a.end.y} vectorEffect={ns} />
        <line x1={a.end.x} y1={a.end.y} x2={hx1} y2={hy1} vectorEffect={ns} />
        <line x1={a.end.x} y1={a.end.y} x2={hx2} y2={hy2} vectorEffect={ns} />
      </g>
    );
  }

  if (a.type === "text" && a.position && a.text) {
    const fontSizeImg = Math.max(a.strokeWidth * 8 + 12, 16);
    return (
      <text
        x={a.position.x}
        y={a.position.y}
        fill={stroke}
        fontSize={fontSizeImg}
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        dominantBaseline="hanging"
      >
        {a.text.split("\n").map((line, i) => (
          <tspan key={i} x={a.position!.x} dy={i === 0 ? 0 : fontSizeImg * 1.2}>
            {line}
          </tspan>
        ))}
      </text>
    );
  }

  return null;
}

// ─── Hit-testing for the eraser ─────────────────────────────────────────────

function pointToSegmentDistance(p: ImagePoint, a: ImagePoint, b: ImagePoint): number {
  const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * (b.x - a.x);
  const projY = a.y + t * (b.y - a.y);
  return Math.hypot(p.x - projX, p.y - projY);
}

function findAnnotationAt(annotations: Annotation[], pt: ImagePoint): Annotation | null {
  const tol = 24;
  for (let i = annotations.length - 1; i >= 0; i--) {
    const a = annotations[i];
    if ((a.type === "pen" || a.type === "highlighter") && a.points && a.points.length > 0) {
      if (a.points.length === 1) {
        if (Math.hypot(a.points[0].x - pt.x, a.points[0].y - pt.y) < tol) return a;
      } else {
        for (let j = 0; j < a.points.length - 1; j++) {
          if (pointToSegmentDistance(pt, a.points[j], a.points[j + 1]) < tol) return a;
        }
      }
    } else if (a.type === "rectangle" && a.start && a.end) {
      const minX = Math.min(a.start.x, a.end.x) - tol;
      const maxX = Math.max(a.start.x, a.end.x) + tol;
      const minY = Math.min(a.start.y, a.end.y) - tol;
      const maxY = Math.max(a.start.y, a.end.y) + tol;
      if (pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY) return a;
    } else if (a.type === "arrow" && a.start && a.end) {
      const { start, end } = a;
      if (pointToSegmentDistance(pt, start, end) < tol) return a;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.hypot(dx, dy) || 1;
      const headLen = Math.max(len * 0.15, a.strokeWidth * 8);
      const angle = Math.atan2(dy, dx);
      const head1 = {
        x: end.x - headLen * Math.cos(angle - Math.PI / 6),
        y: end.y - headLen * Math.sin(angle - Math.PI / 6),
      };
      const head2 = {
        x: end.x - headLen * Math.cos(angle + Math.PI / 6),
        y: end.y - headLen * Math.sin(angle + Math.PI / 6),
      };
      if (
        pointToSegmentDistance(pt, end, head1) < tol ||
        pointToSegmentDistance(pt, end, head2) < tol
      ) {
        return a;
      }
    } else if (a.type === "text" && a.position) {
      const fontSize = Math.max(a.strokeWidth * 8 + 12, 16);
      if (
        pt.x >= a.position.x - tol &&
        pt.x <= a.position.x + (a.text?.length ?? 0) * fontSize * 0.6 + tol &&
        pt.y >= a.position.y - tol &&
        pt.y <= a.position.y + fontSize + tol
      ) {
        return a;
      }
    }
  }
  return null;
}
