"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Search,
  Activity,
  X,
  Pencil,
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
  Link2,
  Link,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import dynamic from "next/dynamic";
import { useDrawing, useDrawings } from "@/hooks/use-drawings";
import { DrawingComments } from "@/components/drawings/DrawingComments";
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
        <div className="h-6 w-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      </div>
    ),
  }
);

// ── Types ─────────────────────────────────────────────────────────────────────

type AnnotationTool = "select" | "pen" | "rectangle" | "arrow" | "text" | "eraser" | "comment" | "link";
type RightPanel = "info" | "search" | "activity" | "links" | null;

// Annotation tools (excludes "link" which is handled separately)
const ANNOTATION_TOOLS: { tool: AnnotationTool; icon: React.ReactNode; label: string }[] = [
  { tool: "select", icon: <MousePointer2 className="h-4 w-4" />, label: "Select" },
  { tool: "pen", icon: <Pencil className="h-4 w-4" />, label: "Pen" },
  { tool: "rectangle", icon: <Square className="h-4 w-4" />, label: "Rectangle" },
  { tool: "arrow", icon: <ArrowUpRight className="h-4 w-4" />, label: "Arrow" },
  { tool: "text", icon: <Type className="h-4 w-4" />, label: "Text" },
  { tool: "eraser", icon: <Eraser className="h-4 w-4" />, label: "Eraser" },
  { tool: "comment", icon: <MessageSquare className="h-4 w-4" />, label: "Comment" },
  { tool: "link", icon: <Link2 className="h-4 w-4" />, label: "Link" },
];

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#000000", "#ffffff",
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

// ── Link pin renderer ─────────────────────────────────────────────────────────

function LinkPin({
  pin,
  highlighted,
}: {
  pin: DrawingMarkupPin;
  highlighted: boolean;
}) {
  const config = PIN_TYPE_CONFIG[pin.pin_type];
  const pinColor = pin.color ?? config?.color ?? "#3b82f6";

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
          "flex items-center gap-1 px-1.5 py-0.5 rounded shadow-md text-white text-[10px] font-semibold transition-all",
          highlighted ? "scale-110 ring-2 ring-white" : ""
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
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const drawingId = params.drawingId as string;

  const { data: drawing, isLoading, error } = useDrawing(projectId, drawingId);
  const { data: drawingsData } = useDrawings(projectId, { page_size: 200 });
  const { data: pins = [] } = useDrawingPins(projectId, drawingId);
  const createPin = useCreateDrawingPin(projectId, drawingId);

  const [signedFileUrl, setSignedFileUrl] = useState<string | null>(null);

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
  const rotateRight = () => setViewRotation((r) => (r + 90) % 360);

  // Right panel
  const [activePanel, setActivePanel] = useState<RightPanel>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Page info
  const [pageInfo, setPageInfo] = useState({ current: 1, total: 0 });

  useEffect(() => {
    if (!drawing?.current_revision?.file_url) return;
    fetch(`/api/projects/${projectId}/drawings/${drawingId}/download`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.downloadUrl) setSignedFileUrl(data.downloadUrl); })
      .catch(() => {});
  }, [drawing, projectId, drawingId]);

  // Prev/next drawing navigation
  const drawings = drawingsData?.drawings ?? [];
  const currentIndex = drawings.findIndex((d) => d.id === drawingId);
  const prevDrawing = currentIndex > 0 ? drawings[currentIndex - 1] : null;
  const nextDrawing = currentIndex >= 0 && currentIndex < drawings.length - 1 ? drawings[currentIndex + 1] : null;

  const navigateToDrawing = useCallback((id: string) => {
    router.push(`/${projectId}/drawings/viewer/${id}`);
  }, [projectId, router]);

  const handleDownload = useCallback(async () => {
    if (!drawing) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/drawings/${drawingId}/download`);
      if (!response.ok) throw new Error("Failed to download drawing");
      const data = await response.json();
      if (data.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = data.fileName ?? `${drawing.drawing_number || drawing.title}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Drawing downloaded");
      }
    } catch {
      toast.error("Failed to download drawing");
    }
  }, [projectId, drawingId, drawing]);

  const handleClose = () => router.push(`/${projectId}/drawings`);

  const handlePageNumberChange = useCallback((page: number, total: number) => {
    setPageInfo({ current: page, total });
  }, []);

  const togglePanel = (panel: RightPanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

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
        (d) =>
          d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.drawingNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : drawings;

  // Link pins overlay (rendered inside the PDF page container)
  const linkPinsOverlay = (
    <>
      {pins
        .filter((p) => p.page === pageInfo.current || pageInfo.total === 0)
        .map((pin) => (
          <LinkPin
            key={pin.id}
            pin={pin}
            highlighted={highlightedPinId === pin.id}
          />
        ))}
    </>
  );

  // The tool passed to DrawingViewer — "link" maps to "comment" in the canvas
  // (both use the canvas click handler, but we intercept "link" clicks above)
  const viewerTool = activeTool === "link" ? "comment" : activeTool;

  if (error) {
    return (
      <div className="h-screen bg-zinc-900 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">{error instanceof Error ? error.message : "Drawing not found"}</p>
          <Button variant="outline" onClick={handleClose}>Back to Drawings</Button>
        </div>
      </div>
    );
  }

  const rev = drawing?.current_revision;

  return (
    <TooltipProvider>
      <div className="h-screen overflow-hidden flex flex-col bg-zinc-900 text-white">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="h-11 shrink-0 flex items-center justify-between px-2 bg-zinc-800 border-b border-zinc-700">

          {/* Left: prev/next + drawing info */}
          <div className="flex items-center gap-1 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-30"
                  disabled={!prevDrawing}
                  onClick={() => prevDrawing && navigateToDrawing(prevDrawing.id)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{prevDrawing ? `Previous: ${prevDrawing.title}` : "No previous drawing"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-30"
                  disabled={!nextDrawing}
                  onClick={() => nextDrawing && navigateToDrawing(nextDrawing.id)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{nextDrawing ? `Next: ${nextDrawing.title}` : "No next drawing"}</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-zinc-600 mx-1" />

            {drawing ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium text-white hover:bg-zinc-700 transition-colors max-w-56"
                  >
                    {drawing.drawing_number && (
                      <span className="text-zinc-400 text-xs shrink-0">{drawing.drawing_number}</span>
                    )}
                    <span className="truncate">{drawing.title}</span>
                    <ChevronLeft className="h-3 w-3 rotate-[-90deg] text-zinc-400 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                  {drawings.map((d) => (
                    <DropdownMenuItem
                      key={d.id}
                      onClick={() => navigateToDrawing(d.id)}
                      className={cn(d.id === drawingId && "bg-accent")}
                    >
                      <span className="text-muted-foreground text-xs mr-2">{d.drawingNumber}</span>
                      {d.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="h-5 w-40 bg-zinc-700 rounded animate-pulse" />
            )}

            {rev && (
              <>
                <div className="w-px h-4 bg-zinc-600 mx-1" />
                <span className="text-xs text-zinc-400 shrink-0">Rev {rev.revision_number}</span>
              </>
            )}

            {pageInfo.total > 1 && (
              <>
                <div className="w-px h-4 bg-zinc-600 mx-1" />
                <span className="text-xs text-zinc-400 shrink-0">
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
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-zinc-300 hover:text-white hover:bg-zinc-700"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Download</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-zinc-600 mx-1" />

            {(
              [
                { panel: "links" as RightPanel, icon: <Link className="h-4 w-4" />, label: `Links${pins.length > 0 ? ` (${pins.length})` : ""}` },
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
                        ? "bg-zinc-600 text-white"
                        : "text-zinc-300 hover:text-white hover:bg-zinc-700"
                    )}
                    onClick={() => togglePanel(panel)}
                  >
                    {icon}
                    {panel === "links" && pins.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-blue-500 rounded-full text-[7px] font-bold flex items-center justify-center">
                        {pins.length}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{label}</TooltipContent>
              </Tooltip>
            ))}

            <div className="w-px h-4 bg-zinc-600 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-zinc-300 hover:text-white hover:bg-zinc-700"
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
        <div className="flex-1 flex overflow-hidden">

          {/* ── Left sidebar ─────────────────────────────────────────────── */}
          <div className="w-14 shrink-0 flex flex-col items-center py-3 gap-1 bg-zinc-800 border-r border-zinc-700">
            {ANNOTATION_TOOLS.map(({ tool, icon, label }) => (
              <Tooltip key={tool}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setActiveTool(tool)}
                    className={cn(
                      "w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-md transition-colors text-xs",
                      activeTool === tool
                        ? tool === "link"
                          ? "bg-green-600 text-white"
                          : "bg-blue-600 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-700"
                    )}
                  >
                    {icon}
                    <span className="text-[9px] leading-none">{label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            ))}

            {/* Color swatches — only for drawing tools */}
            {activeTool !== "select" && activeTool !== "comment" && activeTool !== "link" && (
              <>
                <div className="w-8 h-px bg-zinc-700 my-1" />
                <div className="flex flex-col items-center gap-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAnnotationColor(c)}
                      className={cn(
                        "h-5 w-5 rounded-full border-2 transition-transform",
                        annotationColor === c ? "border-white scale-110" : "border-transparent hover:scale-110"
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
                <div className="w-8 h-px bg-zinc-700 my-1" />
                <p className="text-[9px] text-zinc-500 text-center px-1 leading-tight">
                  Click on drawing to place a link pin
                </p>
              </>
            )}

            {/* Zoom + rotate at bottom */}
            <div className="mt-auto pb-1 flex flex-col items-center gap-1">
              <div className="w-8 h-px bg-zinc-700 mb-1" />
              {[
                { action: zoomIn, icon: <ZoomIn className="h-4 w-4" />, label: "Zoom in" },
                { action: zoomOut, icon: <ZoomOut className="h-4 w-4" />, label: "Zoom out" },
                { action: rotateRight, icon: <RotateCw className="h-4 w-4" />, label: "Rotate 90°" },
              ].map(({ action, icon, label }) => (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={action}
                      className="w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-md transition-colors text-zinc-400 hover:text-white hover:bg-zinc-700"
                    >
                      {icon}
                      <span className="text-[9px] leading-none">{label.split(" ")[0]}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* ── PDF viewer ───────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden bg-zinc-900 min-w-0">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="h-6 w-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              </div>
            )}
            {signedFileUrl && (
              <DrawingViewerWithComments
                drawingId={drawingId}
                fileUrl={signedFileUrl}
                fileName={drawing?.title || "Drawing"}
                drawingNumber={drawing?.drawing_number ?? undefined}
                title={drawing?.title ?? undefined}
                showToolbar={false}
                controlledTool={viewerTool as "select" | "pen" | "rectangle" | "arrow" | "text" | "eraser" | "comment"}
                controlledColor={annotationColor}
                controlledScale={viewScale}
                onScaleChange={setViewScale}
                controlledRotation={viewRotation}
                onRotationChange={setViewRotation}
                onPageNumberChange={handlePageNumberChange}
                onCommentClick={handleCommentClick}
                linkPinsOverlay={linkPinsOverlay}
                className="h-full border-none rounded-none bg-zinc-900"
              />
            )}
            {!isLoading && !signedFileUrl && drawing?.current_revision?.file_url && (
              <div className="flex items-center justify-center h-full">
                <div className="h-6 w-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* ── Right sidebar ────────────────────────────────────────────── */}
          {activePanel && (
            <div className="w-72 shrink-0 flex flex-col bg-zinc-800 border-l border-zinc-700 overflow-hidden">

              {/* Panel header */}
              <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-zinc-700">
                <span className="text-sm font-medium text-white capitalize">
                  {activePanel === "activity" ? "Activity"
                    : activePanel === "info" ? "Info"
                    : activePanel === "links" ? "Links"
                    : "Search"}
                </span>
                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className="h-6 w-6 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* ── Links panel ─────────────────────────────────────────── */}
              {activePanel === "links" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-3 py-2 border-b border-zinc-700 flex items-center justify-between">
                    <span className="text-xs text-zinc-400">
                      {pins.length} link{pins.length !== 1 ? "s" : ""} on this drawing
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setActiveTool("link")}
                          className="h-6 w-6 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
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

              {/* ── Info panel ─────────────────────────────────────────── */}
              {activePanel === "info" && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {drawing ? (
                    <>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Drawing</p>
                        <p className="text-sm font-medium text-white">{drawing.title}</p>
                        {drawing.drawing_number && (
                          <p className="text-xs text-zinc-400 mt-0.5">{drawing.drawing_number}</p>
                        )}
                      </div>
                      <div className="space-y-2">
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
                            <div key={row.label} className="flex justify-between gap-2">
                              <span className="text-xs text-zinc-500 shrink-0">{row.label}</span>
                              <span className="text-xs text-zinc-300 text-right truncate">{row.value}</span>
                            </div>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-4 bg-zinc-700 rounded animate-pulse" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Search panel ───────────────────────────────────────── */}
              {activePanel === "search" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-2 border-b border-zinc-700">
                    <Input
                      autoFocus
                      placeholder="Search drawings…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400 text-sm focus-visible:ring-zinc-500"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {filteredDrawings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-3 text-center">
                        <FileText className="h-8 w-8 text-zinc-600 mb-2" />
                        <p className="text-xs text-zinc-500">No drawings match your search</p>
                      </div>
                    ) : (
                      filteredDrawings.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => navigateToDrawing(d.id)}
                          className={cn(
                            "w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-zinc-700 transition-colors border-b border-zinc-700/50",
                            d.id === drawingId && "bg-zinc-700/60"
                          )}
                        >
                          <FileText className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            {d.drawingNumber && (
                              <p className="text-[10px] text-zinc-500 leading-none mb-0.5">{d.drawingNumber}</p>
                            )}
                            <p className="text-xs text-zinc-200 truncate">{d.title}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ── Activity / Comments panel ───────────────────────────── */}
              {activePanel === "activity" && (
                <div className="flex-1 overflow-y-auto p-3">
                  <DrawingComments drawingId={drawingId} />
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
  );
}
