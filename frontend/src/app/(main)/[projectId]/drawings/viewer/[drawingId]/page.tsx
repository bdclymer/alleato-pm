"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Share2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDrawing } from "@/hooks/use-drawings";

// Dynamically import the DrawingViewer component to avoid SSR issues
const DrawingViewer = dynamic(
  () => import("@/components/drawings/DrawingViewer").then(mod => ({ default: mod.DrawingViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading viewer...</div>
      </div>
    ),
  }
);

export default function DrawingViewerPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const drawingId = params.drawingId as string;

  const { data: drawing, isLoading, error } = useDrawing(projectId, drawingId);

  const handleDownload = useCallback(async () => {
    if (!drawing) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/drawings/${drawingId}/download`);
      if (!response.ok) {
        throw new Error("Failed to download drawing");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${drawing.drawing_number || drawing.title}-${drawing.current_revision?.revision_number ?? 'latest'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Drawing downloaded successfully");
    } catch (error) {
      toast.error("Failed to download drawing");
      console.error("Error downloading drawing:", error);
    }
  }, [projectId, drawingId, drawing]);

  const handleShare = useCallback(async () => {
    if (!drawing) return;

    const shareUrl = `${window.location.origin}/${projectId}/drawings/viewer/${drawingId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: drawing.title || "Drawing",
          url: shareUrl,
        });
      } catch (error) {
        console.warn("Share cancelled or failed:", error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Drawing URL copied to clipboard");
      } catch (error) {
        toast.error("Failed to copy URL to clipboard");
      }
    }
  }, [projectId, drawingId, drawing]);

  const handleBack = () => {
    router.push(`/${projectId}/drawings/revisions`);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">Drawing Not Found</h1>
          <p className="text-muted-foreground mb-6">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Drawings
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-muted-foreground">Loading drawing...</div>
        </div>
      </div>
    );
  }

  if (!drawing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">Drawing Not Found</h1>
          <p className="text-muted-foreground mb-6">The requested drawing could not be found.</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Drawings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header Bar */}
      <div className="bg-card border-b px-4 py-3 flex items-center justify-between">
        {/* Left side - Back button and breadcrumb */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="hidden lg:block">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/${projectId}/drawings`}>
                    Drawings
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/${projectId}/drawings/revisions`}>
                    Revisions
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="text-foreground truncate max-w-[200px]">
                  {drawing.title}
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Center - Drawing info */}
        <div className="text-center min-w-0 flex-1 hidden md:block">
          <h1 className="font-semibold text-foreground truncate">
            {drawing.title}
          </h1>
          <p className="text-sm text-muted-foreground truncate">
            {drawing.drawing_number && `${drawing.drawing_number} • `}
            Revision {drawing.current_revision?.revision_number ?? 'N/A'}
          </p>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline sm:ml-2">Share</span>
          </Button>

          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline sm:ml-2">Download</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <span className="hidden sm:inline">More</span>
                <span className="sm:hidden">⋯</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/${projectId}/drawings/${drawing.id}`)}>
                View Drawing Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/${projectId}/drawings/${drawing.id}/revisions`)}>
                All Revisions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => drawing.current_revision?.file_url && window.open(drawing.current_revision.file_url, "_blank")}>
                Open in New Tab
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile title bar */}
      <div className="bg-card border-b px-4 py-2 md:hidden">
        <h1 className="font-semibold text-foreground truncate">
          {drawing.title}
        </h1>
        <p className="text-sm text-muted-foreground truncate">
          Revision {drawing.current_revision?.revision_number ?? 'N/A'}
        </p>
      </div>

      {/* Viewer */}
      <div className="flex-1 bg-muted/20">
        {drawing.current_revision?.file_url ? (
          <DrawingViewer
            fileUrl={drawing.current_revision.file_url}
            fileName={drawing.title || "Drawing"}
            drawingNumber={drawing.drawing_number ?? undefined}
            title={drawing.title ?? undefined}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">No File Available</h2>
              <p className="text-muted-foreground">This drawing does not have a current revision file.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
