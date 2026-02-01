"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, ZoomIn, ZoomOut, RotateCw, Share2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
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

interface DrawingRevision {
  id: string;
  drawing_id: string;
  version: string;
  title: string;
  discipline: string;
  file_url: string;
  file_size?: number;
  file_type: string;
  page_count?: number;
  created_at: string;
  created_by_name?: string;
  drawing_title?: string;
  drawing_number?: string;
  drawing_area_name?: string;
}

export default function DrawingViewerPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const drawingId = params.drawingId as string;

  const [revision, setRevision] = useState<DrawingRevision | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Viewer controls state
  const [viewerKey, setViewerKey] = useState(0); // Force re-render of viewer

  useEffect(() => {
    async function fetchRevision() {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // Fetch the specific drawing revision with related data
        const { data, error: fetchError } = await supabase
          .from("drawing_revisions")
          .select(`
            id,
            drawing_id,
            version,
            title,
            discipline,
            file_url,
            file_size,
            file_type,
            page_count,
            created_at,
            drawings!inner(
              title,
              number,
              drawing_areas(name)
            ),
            created_by:profiles!drawing_revisions_created_by_fkey(
              display_name
            )
          `)
          .eq("id", drawingId)
          .eq("drawings.project_id", parseInt(projectId, 10))
          .is("deleted_at", null)
          .single();

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            throw new Error("Drawing not found");
          }
          throw fetchError;
        }

        // Transform data for display
        const transformedRevision: DrawingRevision = {
          id: data.id,
          drawing_id: data.drawing_id,
          version: data.version,
          title: data.title,
          discipline: data.discipline,
          file_url: data.file_url,
          file_size: data.file_size,
          file_type: data.file_type,
          page_count: data.page_count,
          created_at: data.created_at,
          created_by_name: data.created_by?.display_name,
          drawing_title: data.drawings?.title,
          drawing_number: data.drawings?.number,
          drawing_area_name: data.drawings?.drawing_areas?.name,
        };

        setRevision(transformedRevision);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load drawing");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRevision();
  }, [projectId, drawingId]);

  const handleDownload = useCallback(async () => {
    if (!revision) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/drawings/revisions/${drawingId}/download`);
      if (!response.ok) {
        throw new Error("Failed to download drawing");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement("a");
      a.href = url;
      a.download = `${revision.drawing_number || revision.title}-${revision.version}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Drawing downloaded successfully");
    } catch (error) {
      toast.error("Failed to download drawing");
      console.error("Error downloading drawing:", error);
    }
  }, [projectId, drawingId, revision]);

  const handleShare = useCallback(async () => {
    if (!revision) return;

    const shareUrl = `${window.location.origin}/${projectId}/drawings/viewer/${drawingId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: revision.title || revision.drawing_title || "Drawing",
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled share or share failed
        console.log("Share cancelled or failed:", error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Drawing URL copied to clipboard");
      } catch (error) {
        toast.error("Failed to copy URL to clipboard");
      }
    }
  }, [projectId, drawingId, revision]);

  const handleBack = () => {
    router.push(`/${projectId}/drawings/revisions`);
  };

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case "Escape":
        handleBack();
        break;
      case "d":
      case "D":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handleDownload();
        }
        break;
    }
  }, [handleBack, handleDownload]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">Drawing Not Found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
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

  if (!revision) {
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
                  {revision.title || revision.drawing_title}
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Center - Drawing info */}
        <div className="text-center min-w-0 flex-1 hidden md:block">
          <h1 className="font-semibold text-foreground truncate">
            {revision.title || revision.drawing_title}
          </h1>
          <p className="text-sm text-muted-foreground truncate">
            {revision.drawing_number && `${revision.drawing_number} • `}
            Version {revision.version}
            {revision.drawing_area_name && ` • ${revision.drawing_area_name}`}
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
              <DropdownMenuItem onClick={() => router.push(`/${projectId}/drawings/${revision.drawing_id}`)}>
                View Drawing Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/${projectId}/drawings/${revision.drawing_id}/revisions`)}>
                All Revisions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(revision.file_url, "_blank")}>
                Open in New Tab
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile title bar */}
      <div className="bg-card border-b px-4 py-2 md:hidden">
        <h1 className="font-semibold text-foreground truncate">
          {revision.title || revision.drawing_title}
        </h1>
        <p className="text-sm text-muted-foreground truncate">
          Version {revision.version}
          {revision.drawing_area_name && ` • ${revision.drawing_area_name}`}
        </p>
      </div>

      {/* Viewer */}
      <div className="flex-1 bg-muted/20">
        <DrawingViewer
          key={viewerKey}
          fileUrl={revision.file_url}
          fileName={revision.title || revision.drawing_title || "Drawing"}
          fileType={revision.file_type}
          pageCount={revision.page_count}
        />
      </div>
    </div>
  );
}