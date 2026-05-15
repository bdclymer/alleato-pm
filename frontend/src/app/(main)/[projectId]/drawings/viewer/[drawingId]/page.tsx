"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Search,
  Activity,
  X,
  Eye,
  EyeOff,
  Pencil,
  Highlighter,
  MousePointer2,
  Square,
  ArrowUpRight,
  Type,
  Eraser,
  MessageSquare,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Link2,
  Link,
  Plus,
  Maximize2,
  Minimize2,
  GripVertical,
  SlidersHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/layout";
import { EmptyState } from "@/components/ds";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import dynamic from "next/dynamic";
import { useDrawing, useDrawings } from "@/hooks/use-drawings";
import { DrawingComments } from "@/components/drawings/DrawingComments";
import { getDrawingDisplayIdentity } from "@/lib/drawings/drawing-identity";
import {
  useDrawingPins,
  useCreateDrawingPin,
  type DrawingMarkupPin,
  type CreatePinInput,
} from "@/hooks/use-drawing-pins";
import { LinkPinModal, PIN_TYPE_CONFIG } from "@/components/drawings/LinkPinModal";
import { DrawingLinksPanel } from "@/components/drawings/DrawingLinksPanel";

// Dynamically import to avoid SSR issues (react-pdf requires browser APIs)
const DrawingViewerWithComments = dynamic(
  () =>
    import("@/components/drawings/DrawingViewerWithComments").then(
      (mod) => ({ default: mod.DrawingViewerWithComments })
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="h-6 w-6 border-2 border-foreground/40 border-t-foreground rounded-full animate-spin" />
      </div>
    ),
  }
);

// ── Types ─────────────────────────────────────────────────────────────────────

type AnnotationTool = "select" | "pen" | "highlighter" | "rectangle" | "arrow" | "text" | "eraser" | "comment" | "link";
type RightPanel = "info" | "search" | "activity" | "links" | "filter" | null;
type LocalAnnotationType = "pen" | "highlighter" | "rectangle" | "arrow" | "text";
type PinFilterType = DrawingMarkupPin["pin_type"];
type DrawingSearchItem = {
  drawingNumber?: string | null;
  title?: string | null;
};

// Annotation tools (excludes "link" which is handled separately)
const ANNOTATION_TOOLS: { tool: AnnotationTool; icon: React.ReactNode; label: string }[] = [
  { tool: "select", icon: <MousePointer2 className="h-4 w-4" />, label: "Select" },
  { tool: "pen", icon: <Pencil className="h-4 w-4" />, label: "Pen" },
  { tool: "highlighter", icon: <Highlighter className="h-4 w-4" />, label: "Highlight" },
  { tool: "rectangle", icon: <Square className="h-4 w-4" />, label: "Rectangle" },
  { tool: "arrow", icon: <ArrowUpRight className="h-4 w-4" />, label: "Arrow" },
  { tool: "text", icon: <Type className="h-4 w-4" />, label: "Text" },
  { tool: "eraser", icon: <Eraser className="h-4 w-4" />, label: "Eraser" },
  { tool: "comment", icon: <MessageSquare className="h-4 w-4" />, label: "Comment" },
  { tool: "link", icon: <Link2 className="h-4 w-4" />, label: "Link" },
];

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

const LOCAL_ANNOTATION_FILTERS: { key: LocalAnnotationType; label: string }[] = [
  { key: "pen", label: "Freehand" },
  { key: "highlighter", label: "Highlights" },
  { key: "rectangle", label: "Rectangles" },
  { key: "arrow", label: "Arrows" },
  { key: "text", label: "Text" },
];

const PIN_FILTERS: { key: PinFilterType; label: string }[] = [
  { key: "rfi", label: "RFIs" },
  { key: "punch_item", label: "Punch Items" },
  { key: "coordination_issue", label: "Coordination Issues" },
  { key: "task", label: "Tasks" },
  { key: "drawing", label: "Drawing Links" },
  { key: "document", label: "Documents" },
  { key: "photo", label: "Photos" },
];

function formatDateSafe(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try { return format(new Date(dateStr), "MMM d, yyyy"); } catch { return "—"; }
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getSearchItemIdentity(drawing: DrawingSearchItem) {
  return getDrawingDisplayIdentity({
    drawingNumber: drawing.drawingNumber,
    title: drawing.title,
  });
}

function getSearchItemLabel(drawing: DrawingSearchItem) {
  const identity = getSearchItemIdentity(drawing);

  return identity.title || identity.number || "Drawing";
}

// ── Link pin renderer ─────────────────────────────────────────────────────────

function LinkPin({
  pin,
  highlighted,
}: {
  pin: DrawingMarkupPin;
  highlighted: boolean;
}) {
  const config = PIN_TYPE_CONFIG[pin.pin_type];
  const pinColor = pin.color ?? config?.color ?? "hsl(var(--status-info))";

  return (
    <div
      style={{
        position: "absolute",
        left: `${pin.x_pct}%`,
        top: `${pin.y_pct}%`,
        transform: "translate(-50%, -100%)",
        zIndex: 25,
        cursor: "default",
        pointerEvents: "none",
      }}
    >
      {/* Flag pin shape */}
      <div
        className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded shadow-sm text-white text-[10px] font-semibold transition-all",
          highlighted ? "scale-110 ring-2 ring-foreground" : ""
        )}
        style={{ backgroundColor: pinColor, minWidth: 24 }}
      >
        {config?.icon && (
          <span className="opacity-90 [&>svg]:h-3 [&>svg]:w-3">{config.icon}</span>
        )}
        {pin.entity_number && <span>{pin.entity_number}</span>}
      </div>
      {/* Pin tail */}
      <div
        className="mx-auto"
        style={{
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: `7px solid ${pinColor}`,
        }}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DrawingViewerPage() {
  const params = useParams()! ?? {};
  const router = useRouter();
  const projectId = params.projectId as string;
  const drawingId = params.drawingId as string;

  const { data: drawing, isLoading, error } = useDrawing(projectId, drawingId);
  const { data: drawingsData } = useDrawings(projectId, { page_size: 200 });
  const { data: pins = [] } = useDrawingPins(projectId, drawingId);
  const createPin = useCreateDrawingPin(projectId, drawingId);

  // Use the proxy URL directly — avoids Supabase signed-URL range-request 400s
  const proxyFileUrl = drawing?.current_revision?.file_url
    ? `/api/projects/${projectId}/drawings/${drawingId}/pdf-proxy`
    : null;

  // Annotation/tool state
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [annotationColor, setAnnotationColor] = useState("#ef4444");

  // Link pin state
  const [pendingLinkPos, setPendingLinkPos] = useState<{ x: number; y: number; page: number } | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [highlightedPinId, setHighlightedPinId] = useState<string | null>(null);

  // Viewport state (controlled from sidebar)
  const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
  const [viewScale, setViewScale] = useState<number | undefined>(undefined);
  const [viewRotation, setViewRotation] = useState(0);
  const zoomIn = () => setViewScale((s) => {
    const cur = s ?? 1;
    return Math.min(ZOOM_LEVELS.find((l) => l > cur) ?? cur * 1.25, 5);
  });
  const zoomOut = () => setViewScale((s) => {
    const cur = s ?? 1;
    return Math.max([...ZOOM_LEVELS].reverse().find((l) => l < cur) ?? cur * 0.8, 0.1);
  });
  const rotateLeft = () => setViewRotation((r) => ((r - 90) % 360 + 360) % 360);
  const rotateRight = () => setViewRotation((r) => (r + 90) % 360);

  // Right panel
  const [activePanel, setActivePanel] = useState<RightPanel>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleLayers, setVisibleLayers] = useState({
    comments: true,
    links: true,
    localMarkup: true,
  });
  const [visibleLocalAnnotations, setVisibleLocalAnnotations] = useState<Record<LocalAnnotationType, boolean>>({
    pen: true,
    highlighter: true,
    rectangle: true,
    arrow: true,
    text: true,
  });
  const [visiblePinTypes, setVisiblePinTypes] = useState<Record<PinFilterType, boolean>>({
    rfi: true,
    punch_item: true,
    coordination_issue: true,
    task: true,
    drawing: true,
    document: true,
    photo: true,
  });
  const [rightPanelWidth, setRightPanelWidth] = useState(360);
  const [isRightPanelExpanded, setIsRightPanelExpanded] = useState(false);
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Page info
  const [pageInfo, setPageInfo] = useState({ current: 1, total: 0 });

  // Prev/next drawing navigation
  const drawings = drawingsData?.drawings ?? [];
  const currentIndex = drawings.findIndex((d) => d.id === drawingId);
  const prevDrawing = currentIndex > 0 ? drawings[currentIndex - 1] : null;
  const nextDrawing = currentIndex >= 0 && currentIndex < drawings.length - 1 ? drawings[currentIndex + 1] : null;
  const drawingIdentity = drawing
    ? getDrawingDisplayIdentity({
        drawingNumber: drawing.drawing_number,
        title: drawing.title,
        fileName: drawing.current_revision?.file_name,
        revisionNumber: drawing.current_revision?.revision_number?.toString(),
      })
    : null;

  const navigateToDrawing = useCallback((id: string) => {
    router.push(`/${projectId}/drawings/viewer/${id}`);
  }, [projectId, router]);

  const handleDownload = useCallback(async () => {
    if (!drawing) return;
    try {
      const data = await apiFetch<{ downloadUrl?: string; fileName?: string }>(
        `/api/projects/${projectId}/drawings/${drawingId}/download`,
      );
      if (data.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        const fallbackName = [
          drawingIdentity?.number,
          drawingIdentity?.title,
        ].filter(Boolean).join(" - ");
        a.download = data.fileName ?? `${fallbackName || "drawing"}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Drawing downloaded");
      }
    } catch (e) {
      toast.error("Failed to download drawing");
    }
  }, [projectId, drawingId, drawing, drawingIdentity]);

  const handleClose = () => router.push(`/${projectId}/drawings`);

  const handlePageNumberChange = useCallback((page: number, total: number) => {
    setPageInfo({ current: page, total });
  }, []);

  const togglePanel = (panel: RightPanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  const clampPanelWidth = useCallback((width: number) => {
    const containerWidth = bodyRef.current?.clientWidth ?? 0;
    const maxWidth = Math.max(360, containerWidth - 56);
    return Math.min(Math.max(width, 320), maxWidth);
  }, []);

  const handleRightPanelExpandToggle = useCallback(() => {
    setIsRightPanelExpanded((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!activePanel) {
      setIsResizingRightPanel(false);
    }
  }, [activePanel]);

  useEffect(() => {
    if (!isRightPanelExpanded || !activePanel) return;
    const resizeObserver = new ResizeObserver(() => {
      const containerWidth = bodyRef.current?.clientWidth ?? 0;
      setRightPanelWidth(Math.max(360, containerWidth - 56));
    });
    if (bodyRef.current) {
      resizeObserver.observe(bodyRef.current);
      setRightPanelWidth(Math.max(360, bodyRef.current.clientWidth - 56));
    }
    return () => resizeObserver.disconnect();
  }, [activePanel, isRightPanelExpanded]);

  useEffect(() => {
    if (!isResizingRightPanel) return;

    const handlePointerMove = (event: MouseEvent) => {
      const containerRect = bodyRef.current?.getBoundingClientRect();
      if (!containerRect) return;
      const nextWidth = containerRect.right - event.clientX;
      setRightPanelWidth(clampPanelWidth(nextWidth));
    };

    const handlePointerUp = () => {
      setIsResizingRightPanel(false);
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [clampPanelWidth, isResizingRightPanel]);

  // Handle link tool click on canvas
  const handleCommentClick = useCallback((x: number, y: number, page: number) => {
    if (activeTool === "link") {
      setPendingLinkPos({ x, y, page });
      setLinkModalOpen(true);
    }
  }, [activeTool]);

  const handleLinkConfirm = async (input: CreatePinInput) => {
    await createPin.mutateAsync(input);
    toast.success("Link added to drawing");
    // Auto-open links panel
    setActivePanel("links");
  };

  // Filtered drawings for search panel
  const filteredDrawings = searchQuery.trim()
    ? drawings.filter(
        (d) => {
          const identity = getSearchItemIdentity(d);
          const query = searchQuery.toLowerCase();

          return (
            identity.title.toLowerCase().includes(query) ||
            identity.number.toLowerCase().includes(query)
          );
        }
      )
    : drawings;

  // Link pins overlay (rendered inside the PDF page container)
  const filteredPins = pins.filter(
    (pin) =>
      visibleLayers.links &&
      visiblePinTypes[pin.pin_type] &&
      (pin.page === pageInfo.current || pageInfo.total === 0)
  );

  const visibleLocalAnnotationTypes = visibleLayers.localMarkup
    ? (Object.entries(visibleLocalAnnotations)
        .filter(([, visible]) => visible)
        .map(([key]) => key) as LocalAnnotationType[])
    : [];

  const linkPinsOverlay = (
    <>
      {filteredPins.map((pin) => (
        <LinkPin
          key={pin.id}
          pin={pin}
          highlighted={highlightedPinId === pin.id}
        />
      ))}
    </>
  );

  const viewerTool = activeTool;

  const toggleLayer = (key: keyof typeof visibleLayers) => {
    setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleLocalAnnotation = (key: LocalAnnotationType) => {
    setVisibleLocalAnnotations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePinType = (key: PinFilterType) => {
    setVisiblePinTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllFilters = (visible: boolean) => {
    setVisibleLayers({
      comments: visible,
      links: visible,
      localMarkup: visible,
    });
    setVisibleLocalAnnotations({
      pen: visible,
      highlighter: visible,
      rectangle: visible,
      arrow: visible,
      text: visible,
    });
    setVisiblePinTypes({
      rfi: visible,
      punch_item: visible,
      coordination_issue: visible,
      task: visible,
      drawing: visible,
      document: visible,
      photo: visible,
    });
  };

  if (error) {
    return (
      <div className="h-screen bg-background flex items-center justify-center text-foreground">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{error instanceof Error ? error.message : "Drawing not found"}</p>
          <Button variant="outline" onClick={handleClose}>Back to Drawings</Button>
        </div>
      </div>
    );
  }

  const rev = drawing?.current_revision;

  return (
    <PageShell
      variant="table"
      title="Drawing Viewer"
      showHeader={false}
      className="dark h-screen overflow-hidden bg-background text-foreground !px-0 !py-0"
      contentClassName="h-full"
    >
      <TooltipProvider>
        <div className="dark h-screen overflow-hidden flex flex-col bg-background text-foreground">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="h-11 shrink-0 flex items-center justify-between px-2 bg-card border-b border-border">

          {/* Left: back + prev/next + drawing info */}
          <div className="flex items-center gap-1 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 px-2 gap-1 text-foreground/80 hover:text-foreground hover:bg-muted"
                  onClick={handleClose}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-xs">Drawings</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Back to Drawings</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-muted mx-0.5" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-foreground/80 hover:text-foreground hover:bg-muted disabled:opacity-30"
                  disabled={!prevDrawing}
                  onClick={() => prevDrawing && navigateToDrawing(prevDrawing.id)}
                >
                  <ChevronLeft />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {prevDrawing ? `Previous: ${getSearchItemLabel(prevDrawing)}` : "No previous drawing"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-foreground/80 hover:text-foreground hover:bg-muted disabled:opacity-30"
                  disabled={!nextDrawing}
                  onClick={() => nextDrawing && navigateToDrawing(nextDrawing.id)}
                >
                  <ChevronRight />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {nextDrawing ? `Next: ${getSearchItemLabel(nextDrawing)}` : "No next drawing"}
              </TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-muted mx-1" />

            {drawing ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium text-foreground hover:bg-muted transition-colors max-w-56 h-auto"
                  >
                    {drawingIdentity?.number && (
                      <span className="text-muted-foreground text-xs shrink-0">{drawingIdentity.number}</span>
                    )}
                    <span className="truncate">{drawingIdentity?.title || drawingIdentity?.number || "Drawing"}</span>
                    <ChevronLeft className="h-3 w-3 rotate-[-90deg] text-muted-foreground shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                  {drawings.map((d) => {
                    const identity = getSearchItemIdentity(d);

                    return (
                      <DropdownMenuItem
                        key={d.id}
                        onClick={() => navigateToDrawing(d.id)}
                        className={cn(d.id === drawingId && "bg-accent")}
                      >
                        {identity.number && (
                          <span className="text-muted-foreground text-xs mr-2">{identity.number}</span>
                        )}
                        {identity.title || identity.number || "Drawing"}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="h-5 w-40 bg-muted rounded animate-pulse" />
            )}

            {rev && (
              <>
                <div className="w-px h-4 bg-muted mx-1" />
                <span className="text-xs text-muted-foreground shrink-0">Rev {rev.revision_number}</span>
              </>
            )}

            {pageInfo.total > 1 && (
              <>
                <div className="w-px h-4 bg-muted mx-1" />
                <span className="text-xs text-muted-foreground shrink-0">
                  Page {pageInfo.current} / {pageInfo.total}
                </span>
              </>
            )}
          </div>

          {/* Right: panel toggles + download + close */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 mr-1 gap-1 text-xs"
                  onClick={() => router.push(`/${projectId}/drawings/viewer-v2/${drawingId}`)}
                >
                  Try v2 prototype
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Open the OpenSeadragon-based prototype viewer</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-foreground/80 hover:text-foreground hover:bg-muted"
                  onClick={handleDownload}
                >
                  <Download />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Download</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-muted mx-1" />

            {(
              [
                { panel: "links" as RightPanel, icon: <Link className="h-4 w-4" />, label: `Links${pins.length > 0 ? ` (${pins.length})` : ""}` },
                { panel: "filter" as RightPanel, icon: <SlidersHorizontal className="h-4 w-4" />, label: "Filter annotations" },
                { panel: "info" as RightPanel, icon: <Info className="h-4 w-4" />, label: "Info" },
                { panel: "search" as RightPanel, icon: <Search className="h-4 w-4" />, label: "Search drawings" },
                { panel: "activity" as RightPanel, icon: <Activity className="h-4 w-4" />, label: "Activity & Comments" },
              ] as { panel: RightPanel; icon: React.ReactNode; label: string }[]
            ).map(({ panel, icon, label }) => (
              <Tooltip key={panel!}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="sm"
                    className={cn(
                      "h-7 w-7 p-0 relative transition-colors",
                      activePanel === panel
                        ? "bg-muted text-white"
                        : "text-foreground/80 hover:text-foreground hover:bg-muted"
                    )}
                    onClick={() => togglePanel(panel)}
                    aria-label={label}
                  >
                    {icon}
                    {panel === "links" && pins.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-primary rounded-full text-[7px] font-bold flex items-center justify-center">
                        {pins.length}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{label}</TooltipContent>
              </Tooltip>
            ))}

            <div className="w-px h-4 bg-muted mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-foreground/80 hover:text-foreground hover:bg-muted"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div
          ref={bodyRef}
          className={cn(
            "flex-1 flex overflow-hidden",
            isResizingRightPanel && "cursor-col-resize select-none"
          )}
        >

          {/* ── Tools sidebar (left) ──────────────────────────────────── */}
          <div className="w-14 shrink-0 flex flex-col items-center py-3 gap-1 bg-card border-r border-border">
            {ANNOTATION_TOOLS.map(({ tool, icon, label }) => (
              <Tooltip key={tool}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveTool(tool)}
                    className={cn(
                      "w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-md transition-colors text-xs p-0",
                      activeTool === tool
                        ? tool === "link"
                          ? "bg-status-success text-white"
                          : "bg-primary text-white"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {icon}
                    <span className="text-[9px] leading-none">{label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            ))}

            {/* Color swatches — only for drawing tools */}
            {activeTool !== "select" && activeTool !== "comment" && activeTool !== "link" && (
              <>
                <div className="w-8 h-px bg-muted my-1" />
                <div className="flex flex-col items-center gap-1">
                  {PRESET_COLORS.map((c) => (
                    <Button
                      key={c}
                      type="button"
                      variant="ghost"
                      onClick={() => setAnnotationColor(c)}
                      className={cn(
                        "h-5 w-5 rounded-full border-2 transition-transform p-0 min-w-0",
                        annotationColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-110"
                      )}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Link mode hint */}
            {activeTool === "link" && (
              <>
                <div className="w-8 h-px bg-muted my-1" />
                <p className="text-[9px] text-muted-foreground/80 text-center px-1 leading-tight">
                  Click on drawing to place a link pin
                </p>
              </>
            )}

            {/* Zoom + rotate at bottom */}
            <div className="mt-auto pb-1 flex flex-col items-center gap-1">
              <div className="w-8 h-px bg-muted mb-1" />
              {[
                { action: zoomIn, icon: <ZoomIn className="h-4 w-4" />, label: "Zoom in" },
                { action: zoomOut, icon: <ZoomOut className="h-4 w-4" />, label: "Zoom out" },
                { action: rotateLeft, icon: <RotateCcw className="h-4 w-4" />, label: "Rotate left" },
                { action: rotateRight, icon: <RotateCw className="h-4 w-4" />, label: "Rotate 90°" },
              ].map(({ action, icon, label }) => (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={action}
                      className="w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-md transition-colors text-muted-foreground hover:bg-primary/10 hover:text-primary p-0"
                    >
                      {icon}
                      <span className="text-[9px] leading-none">{label.split(" ")[0]}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* ── PDF viewer ───────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden bg-background min-w-0">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="h-6 w-6 border-2 border-foreground/40 border-t-foreground rounded-full animate-spin" />
              </div>
            )}
            {proxyFileUrl && (
              <DrawingViewerWithComments
                drawingId={drawingId}
                fileUrl={proxyFileUrl}
                fileName={drawingIdentity?.title || drawingIdentity?.number || "Drawing"}
                drawingNumber={drawingIdentity?.number ?? undefined}
                title={drawingIdentity?.title || drawingIdentity?.number || undefined}
                showToolbar={false}
                controlledTool={viewerTool as "select" | "pen" | "highlighter" | "rectangle" | "arrow" | "text" | "eraser" | "comment" | "link"}
                controlledColor={annotationColor}
                controlledScale={viewScale}
                onScaleChange={setViewScale}
                controlledRotation={viewRotation}
                onRotationChange={setViewRotation}
                onPageNumberChange={handlePageNumberChange}
                onCommentClick={handleCommentClick}
                linkPinsOverlay={linkPinsOverlay}
                showCommentPins={visibleLayers.comments}
                visibleAnnotationTypes={visibleLocalAnnotationTypes}
                className="h-full border-none rounded-none bg-background"
              />
            )}
            {!isLoading && !proxyFileUrl && drawing?.current_revision?.file_url && (
              <div className="flex items-center justify-center h-full">
                <div className="h-6 w-6 border-2 border-foreground/40 border-t-foreground rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* ── Right sidebar ────────────────────────────────────────────── */}
          {activePanel && (
            <div
              className="relative shrink-0 flex flex-col bg-card border-l border-border overflow-hidden"
              style={{
                width: isRightPanelExpanded
                  ? "calc(100% - 3.5rem)"
                  : `${rightPanelWidth}px`,
              }}
            >
              <Button
                type="button"
                variant="ghost"
                aria-label="Resize sidebar"
                onMouseDown={() => {
                  setIsRightPanelExpanded(false);
                  setIsResizingRightPanel(true);
                }}
                className={cn(
                  "absolute inset-y-0 left-0 z-20 flex w-3 -translate-x-1/2 items-center justify-center rounded-none h-auto p-0",
                  "text-muted-foreground/80 hover:text-foreground/80",
                  isResizingRightPanel && "text-foreground"
                )}
              >
                <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-accent/80" />
                <GripVertical className="relative h-4 w-4 rounded bg-card" />
              </Button>

              {/* Panel header */}
              <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-border">
                <span className="text-sm font-medium text-foreground capitalize">
                  {activePanel === "activity" ? "Activity"
                    : activePanel === "filter" ? "Filter"
                    : activePanel === "info" ? "Info"
                    : activePanel === "links" ? "Links"
                    : "Search"}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRightPanelExpandToggle}
                    className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors p-0"
                    aria-label={isRightPanelExpanded ? "Restore sidebar width" : "Expand sidebar"}
                  >
                    {isRightPanelExpanded ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setActivePanel(null)}
                    className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors p-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* ── Links panel ─────────────────────────────────────────── */}
              {activePanel === "links" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {pins.length} link{pins.length !== 1 ? "s" : ""} on this drawing
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setActiveTool("link")}
                          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors p-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">Add link (click on drawing)</TooltipContent>
                    </Tooltip>
                  </div>
                  <DrawingLinksPanel
                    pins={pins}
                    projectId={projectId}
                    drawingId={drawingId}
                    currentPage={pageInfo.current}
                    onPinHover={setHighlightedPinId}
                  />
                </div>
              )}

              {/* ── Filter panel ────────────────────────────────────────── */}
              {activePanel === "filter" && (
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground/80">Visibility</span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setAllFilters(true)}
                        className="rounded px-2 py-1 text-[11px] text-foreground/80 hover:bg-muted h-auto"
                      >
                        Show all
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setAllFilters(false)}
                        className="rounded px-2 py-1 text-[11px] text-foreground/80 hover:bg-muted h-auto"
                      >
                        Hide all
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground/80">Layers</p>
                    {[
                      { key: "comments" as const, label: "Comments" },
                      { key: "links" as const, label: "Linked items" },
                      { key: "localMarkup" as const, label: "Drawn markup" },
                    ].map((item) => (
                      <Button
                        key={item.key}
                        type="button"
                        variant="ghost"
                        onClick={() => toggleLayer(item.key)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-accent/60 h-auto"
                      >
                        <span className="text-sm text-foreground">{item.label}</span>
                        {visibleLayers[item.key] ? (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground/80" />
                        )}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground/80">Drawn markup</p>
                    {LOCAL_ANNOTATION_FILTERS.map((item) => (
                      <Button
                        key={item.key}
                        type="button"
                        variant="ghost"
                        onClick={() => toggleLocalAnnotation(item.key)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-accent/60 h-auto"
                      >
                        <span className="text-sm text-foreground">{item.label}</span>
                        {visibleLocalAnnotations[item.key] ? (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground/80" />
                        )}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground/80">Linked item types</p>
                    {PIN_FILTERS.map((item) => (
                      <Button
                        key={item.key}
                        type="button"
                        variant="ghost"
                        onClick={() => togglePinType(item.key)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-accent/60 h-auto"
                      >
                        <span className="text-sm text-foreground">{item.label}</span>
                        {visiblePinTypes[item.key] ? (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground/80" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Info panel ─────────────────────────────────────────── */}
              {activePanel === "info" && (
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                  {drawing ? (
                    <>
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Drawing</p>
                        <p className="text-base font-semibold text-foreground leading-tight">
                          {drawingIdentity?.title || drawingIdentity?.number || "Drawing"}
                        </p>
                        {drawingIdentity?.number && drawingIdentity.number !== drawingIdentity.title && (
                          <p className="text-sm text-muted-foreground">{drawingIdentity.number}</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        {[
                          { label: "Discipline", value: drawing.discipline },
                          { label: "Type", value: drawing.drawing_type },
                          { label: "Revision", value: rev?.revision_number },
                          { label: "Status", value: rev?.status },
                          { label: "Drawing Date", value: formatDateSafe(rev?.drawing_date) },
                          { label: "Received", value: formatDateSafe(rev?.received_date) },
                          { label: "File", value: rev?.file_name },
                          { label: "Size", value: rev?.file_size ? formatBytes(rev.file_size) : undefined },
                        ]
                          .filter((row) => row.value)
                          .map((row) => (
                            <div key={row.label} className="grid grid-cols-[120px_1fr] items-start gap-4">
                              <span className="text-xs text-muted-foreground shrink-0 pt-0.5">{row.label}</span>
                              <span className="text-sm text-foreground text-right leading-snug break-words">{row.value}</span>
                            </div>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Search panel ───────────────────────────────────────── */}
              {activePanel === "search" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-3 py-3 border-b border-border">
                    <Input
                      autoFocus
                      placeholder="Search drawings…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 bg-muted border-border/80 text-foreground placeholder:text-muted-foreground text-base focus-visible:ring-ring"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {filteredDrawings.length === 0 ? (
                      <EmptyState
                        icon={<FileText />}
                        title="No drawings match your search"
                        description="Try a different search term."
                      />
                    ) : (
                      filteredDrawings.map((d) => {
                        const identity = getSearchItemIdentity(d);

                        return (
                          <Button
                            key={d.id}
                            type="button"
                            variant="ghost"
                            onClick={() => navigateToDrawing(d.id)}
                            className={cn(
                              "h-auto w-full justify-start rounded-none border-b border-border/50 px-3 py-2 text-left font-normal hover:bg-muted",
                              d.id === drawingId && "bg-muted"
                            )}
                          >
                            <span className="w-20 shrink-0 truncate text-left text-xs tabular-nums text-muted-foreground">
                              {identity.number || "—"}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium leading-5 text-foreground">
                              {identity.title || identity.number || "Drawing"}
                            </span>
                          </Button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ── Activity / Comments panel ───────────────────────────── */}
              {activePanel === "activity" && (
                <div className="flex-1 overflow-y-auto px-3 py-4">
                  <DrawingComments drawingId={drawingId} projectId={Number(projectId)} />
                </div>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Link pin modal */}
        <LinkPinModal
          open={linkModalOpen}
          onOpenChange={setLinkModalOpen}
          projectId={projectId}
          pendingPosition={pendingLinkPos}
          onConfirm={handleLinkConfirm}
        />
      </TooltipProvider>
    </PageShell>
  );
}
