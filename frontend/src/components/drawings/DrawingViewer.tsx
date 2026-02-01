"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Home,
  Loader2,
  AlertCircle,
  FileText,
  Grid3X3,
  Move,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Import PDF.js CSS
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

interface DrawingViewerProps {
  fileUrl: string;
  fileName?: string;
  drawingNumber?: string;
  title?: string;
  onError?: (error: Error) => void;
  onLoadSuccess?: (pdf: any) => void;
  className?: string;
}

interface ViewportState {
  scale: number;
  rotation: number;
  pageNumber: number;
  numPages: number;
  isFullscreen: boolean;
  fitMode: 'width' | 'page' | 'custom';
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

export function DrawingViewer({
  fileUrl,
  fileName = "Drawing",
  drawingNumber,
  title,
  onError,
  onLoadSuccess,
  className,
}: DrawingViewerProps) {
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1,
    rotation: 0,
    pageNumber: 1,
    numPages: 0,
    isFullscreen: false,
    fitMode: 'width',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Container ref for measuring width
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pageRef = React.useRef<HTMLDivElement>(null);

  // Update container width on resize
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);
    return () => window.removeEventListener('resize', updateContainerWidth);
  }, []);

  // Calculate scale for fit modes
  const calculateScale = useCallback((mode: 'width' | 'page', pageWidth?: number, pageHeight?: number) => {
    if (!pageWidth || !pageHeight) return 1;

    const containerHeight = window.innerHeight - 200; // Account for toolbar

    switch (mode) {
      case 'width':
        return Math.min(containerWidth / pageWidth, MAX_ZOOM);
      case 'page':
        return Math.min(
          containerWidth / pageWidth,
          containerHeight / pageHeight,
          MAX_ZOOM
        );
      default:
        return 1;
    }
  }, [containerWidth]);

  const onDocumentLoadSuccess = useCallback((pdf: any) => {
    setViewport(prev => ({
      ...prev,
      numPages: pdf.numPages,
      scale: calculateScale('width'),
      fitMode: 'width',
    }));
    setIsLoading(false);
    setError(null);
    onLoadSuccess?.(pdf);
  }, [calculateScale, onLoadSuccess]);

  const onDocumentLoadError = useCallback((error: Error) => {
    setError(error.message);
    setIsLoading(false);
    onError?.(error);
  }, [onError]);

  const onPageLoadSuccess = useCallback((page: any) => {
    if (viewport.fitMode !== 'custom') {
      const newScale = calculateScale(viewport.fitMode, page.originalWidth, page.originalHeight);
      if (Math.abs(newScale - viewport.scale) > 0.01) {
        setViewport(prev => ({ ...prev, scale: newScale }));
      }
    }
  }, [calculateScale, viewport.fitMode, viewport.scale]);

  // Navigation functions
  const goToPage = useCallback((page: number) => {
    const newPage = Math.max(1, Math.min(page, viewport.numPages));
    setViewport(prev => ({ ...prev, pageNumber: newPage }));
    setPanOffset({ x: 0, y: 0 }); // Reset pan when changing pages
  }, [viewport.numPages]);

  const previousPage = () => goToPage(viewport.pageNumber - 1);
  const nextPage = () => goToPage(viewport.pageNumber + 1);

  // Zoom functions
  const setZoom = useCallback((scale: number) => {
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
    setViewport(prev => ({ ...prev, scale: newScale, fitMode: 'custom' }));
  }, []);

  const zoomIn = () => {
    const currentIndex = ZOOM_LEVELS.findIndex(level => level > viewport.scale);
    const nextLevel = currentIndex >= 0 ? ZOOM_LEVELS[currentIndex] : viewport.scale * 1.25;
    setZoom(nextLevel);
  };

  const zoomOut = () => {
    const currentIndex = ZOOM_LEVELS.findLastIndex(level => level < viewport.scale);
    const nextLevel = currentIndex >= 0 ? ZOOM_LEVELS[currentIndex] : viewport.scale * 0.8;
    setZoom(nextLevel);
  };

  const fitToWidth = () => {
    setViewport(prev => ({ ...prev, fitMode: 'width' }));
  };

  const fitToPage = () => {
    setViewport(prev => ({ ...prev, fitMode: 'page' }));
  };

  const rotate = () => {
    setViewport(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));
  };

  const resetView = () => {
    setViewport(prev => ({
      ...prev,
      scale: calculateScale('width'),
      rotation: 0,
      fitMode: 'width',
    }));
    setPanOffset({ x: 0, y: 0 });
  };

  // Download function
  const downloadFile = useCallback(() => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [fileUrl, fileName]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setViewport(prev => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      setViewport(prev => ({ ...prev, isFullscreen: false }));
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return; // Don't handle if typing in input

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          previousPage();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextPage();
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          resetView();
          break;
        case 'f':
        case 'F11':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'r':
          e.preventDefault();
          rotate();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [previousPage, nextPage, zoomIn, zoomOut, resetView, toggleFullscreen, rotate]);

  // Mouse/touch panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewport.scale <= 1) return; // Only pan when zoomed in

    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;

    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Format zoom percentage
  const zoomPercentage = Math.round(viewport.scale * 100);

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-96 bg-muted/30 rounded-lg", className)}>
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load PDF</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {error}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col h-full bg-background border rounded-lg overflow-hidden",
        viewport.isFullscreen && "fixed inset-0 z-50 rounded-none",
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Drawing Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {drawingNumber && (
                <Badge variant="outline" className="font-mono text-xs">
                  {drawingNumber}
                </Badge>
              )}
              <h3 className="font-semibold truncate text-sm">
                {title || fileName}
              </h3>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <TooltipProvider>
            {/* Page Navigation */}
            {viewport.numPages > 1 && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={previousPage}
                      disabled={viewport.pageNumber === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous Page (←)</TooltipContent>
                </Tooltip>

                <div className="flex items-center gap-2">
                  <Label htmlFor="page-input" className="text-xs">Page</Label>
                  <Input
                    id="page-input"
                    type="number"
                    value={viewport.pageNumber}
                    onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                    className="w-16 h-8 text-xs"
                    min={1}
                    max={viewport.numPages}
                  />
                  <span className="text-xs text-muted-foreground">
                    of {viewport.numPages}
                  </span>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextPage}
                      disabled={viewport.pageNumber === viewport.numPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next Page (→)</TooltipContent>
                </Tooltip>

                <div className="h-4 border-l border-border mx-1" />
              </>
            )}

            {/* Zoom Controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out (-)</TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={zoomPercentage}
                onChange={(e) => setZoom((parseInt(e.target.value) || 100) / 100)}
                className="w-16 h-8 text-xs text-center"
                min={10}
                max={500}
              />
              <span className="text-xs">%</span>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In (+)</TooltipContent>
            </Tooltip>

            {/* Fit Controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewport.fitMode === 'width' ? 'default' : 'outline'}
                  size="sm"
                  onClick={fitToWidth}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fit to Width</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewport.fitMode === 'page' ? 'default' : 'outline'}
                  size="sm"
                  onClick={fitToPage}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fit to Page</TooltipContent>
            </Tooltip>

            <div className="h-4 border-l border-border mx-1" />

            {/* Action Controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={rotate}>
                  <RotateCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rotate (R)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={resetView}>
                  <Home className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset View (0)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={downloadFile}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                  {viewport.isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {viewport.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F)'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* PDF Container */}
      <div
        className={cn(
          "flex-1 overflow-auto bg-gray-100 relative",
          isPanning && "cursor-grabbing",
          viewport.scale > 1 && !isPanning && "cursor-grab"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Loading PDF...</span>
            </div>
          </div>
        )}

        <div
          ref={pageRef}
          className="flex items-center justify-center min-h-full p-4"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
        >
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
            error=""
            className="shadow-lg"
          >
            <Page
              pageNumber={viewport.pageNumber}
              scale={viewport.scale}
              rotate={viewport.rotation}
              onLoadSuccess={onPageLoadSuccess}
              renderMode="canvas"
              className="border border-border"
            />
          </Document>
        </div>
      </div>
    </div>
  );
}