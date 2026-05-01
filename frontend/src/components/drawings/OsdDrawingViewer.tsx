"use client";

import { useEffect, useRef, useState } from "react";
import { pdfjs } from "react-pdf";
import OpenSeadragon from "openseadragon";
import {
  ZoomIn,
  ZoomOut,
  Home,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ds";
import { cn } from "@/lib/utils";

type PdfDocumentProxy = Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>;
type PdfLoadingTask = ReturnType<typeof pdfjs.getDocument>;

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

const TARGET_LONGEST_SIDE_PX = 6000;

interface OsdDrawingViewerProps {
  fileUrl: string;
  className?: string;
}

export function OsdDrawingViewer({ fileUrl, className }: OsdDrawingViewerProps) {
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

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PdfLoadingTask | null = null;
    // Clear any prior error before retrying so a transient failure can recover.
    setError(null);
    (async () => {
      try {
        loadingTask = pdfjs.getDocument({ url: fileUrl });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
        // Reset to page 1 whenever a new document loads — otherwise switching
        // from a drawing that was on page 5 to one with only 2 pages would
        // throw in pdf.getPage() and drop the viewer into an error state.
        setPageNumber(1);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load PDF");
      }
    })();
    return () => {
      cancelled = true;
      try {
        loadingTask?.destroy?.();
      } catch {
        // ignore — task may already be destroyed
      }
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!pdf) return;
    const myToken = ++renderTokenRef.current;
    const isCancelled = () => myToken !== renderTokenRef.current;
    setIsRendering(true);
    setRenderMs(null);
    // Clear any prior render error so a successful page change can recover.
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

        await page.render({ canvasContext: ctx, viewport }).promise;
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

        if (previousUrl) {
          // Defer revoke so OSD has time to fully swap.
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

  useEffect(() => {
    return () => {
      try {
        viewerRef.current?.destroy();
      } catch {}
      viewerRef.current = null;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const zoomIn = () => viewerRef.current?.viewport.zoomBy(1.4);
  const zoomOut = () => viewerRef.current?.viewport.zoomBy(1 / 1.4);
  const home = () => viewerRef.current?.viewport.goHome();
  const fullscreen = () => viewerRef.current?.setFullScreen(true);

  if (error) {
    return (
      <div className={cn("flex h-full items-center justify-center bg-muted/30", className)}>
        <ErrorState title="Failed to load drawing" error={error} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-card">
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
      <div className="relative flex-1 bg-muted/30">
        {isRendering && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 pointer-events-none">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  );
}
