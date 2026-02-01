"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Download, FileText, QrCode, Eye } from "lucide-react";
import { toast } from "sonner";
import { DrawingLogTable } from "@/components/drawings/DrawingLogTable";
import { TableLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
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
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface DrawingRevision {
  id: string;
  drawing_id: string;
  version: string;
  title: string;
  discipline: string;
  drawing_area_name?: string;
  created_by_name: string;
  created_at: string;
  status: string;
  file_size?: number;
  file_type?: string;
  page_count?: number;
  approval_status?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  notes?: string;
}

export default function DrawingRevisionsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [revisions, setRevisions] = useState<DrawingRevision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRevisions() {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // Fetch drawing revisions with related data
        const { data, error: fetchError } = await supabase
          .from("drawing_revisions")
          .select(`
            id,
            drawing_id,
            version,
            title,
            discipline,
            created_at,
            status,
            file_size,
            file_type,
            page_count,
            approval_status,
            reviewed_at,
            notes,
            drawings!inner(
              title,
              drawing_areas(name)
            ),
            created_by:profiles!drawing_revisions_created_by_fkey(
              display_name
            ),
            reviewed_by:profiles!drawing_revisions_reviewed_by_fkey(
              display_name
            )
          `)
          .eq("drawings.project_id", parseInt(projectId, 10))
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        // Transform data for display
        const transformedRevisions: DrawingRevision[] = (data || []).map((item: any) => ({
          id: item.id,
          drawing_id: item.drawing_id,
          version: item.version,
          title: item.title || item.drawings?.title || "Untitled",
          discipline: item.discipline,
          drawing_area_name: item.drawings?.drawing_areas?.name,
          created_by_name: item.created_by?.display_name || "Unknown",
          created_at: item.created_at,
          status: item.status,
          file_size: item.file_size,
          file_type: item.file_type,
          page_count: item.page_count,
          approval_status: item.approval_status,
          reviewed_by_name: item.reviewed_by?.display_name,
          reviewed_at: item.reviewed_at,
          notes: item.notes,
        }));

        setRevisions(transformedRevisions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load drawing revisions");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRevisions();
  }, [projectId]);

  const handleExport = () => {
    // Export functionality handled by DrawingLogTable
  };

  const handleViewDrawing = (revisionId: string) => {
    router.push(`/${projectId}/drawings/viewer/${revisionId}`);
  };

  const handleGenerateQR = useCallback(async (revisionId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/drawings/revisions/${revisionId}/qr`);
      if (!response.ok) {
        throw new Error("Failed to generate QR code");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement("a");
      a.href = url;
      a.download = `drawing-qr-${revisionId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("QR code generated successfully");
    } catch (error) {
      toast.error("Failed to generate QR code");
      console.error("Error generating QR code:", error);
    }
  }, [projectId]);

  const handleDownloadRevision = useCallback(async (revisionId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/drawings/revisions/${revisionId}/download`);
      if (!response.ok) {
        throw new Error("Failed to download drawing");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement("a");
      a.href = url;
      a.download = `drawing-revision-${revisionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Drawing downloaded successfully");
    } catch (error) {
      toast.error("Failed to download drawing");
      console.error("Error downloading drawing:", error);
    }
  }, [projectId]);

  const handleDeleteRevision = useCallback(async (revisionId: string) => {
    if (!confirm("Are you sure you want to delete this drawing revision? This action cannot be undone.")) {
      return {};
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/drawings/revisions/${revisionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete revision");
      }

      toast.success("Drawing revision deleted successfully");

      // Refresh the revisions list
      setRevisions(prev => prev.filter(r => r.id !== revisionId));

      return {};
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete revision";
      toast.error(message);
      return { error: message };
    }
  }, [projectId]);

  if (error) {
    return (
      <TableLayout>
        <div className="text-center text-destructive p-6">
          Error loading drawing revisions: {error}
        </div>
      </TableLayout>
    );
  }

  return (
    <TableLayout>
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={`/${projectId}/drawings`}>
              Drawings
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="text-foreground">
            Revision Log
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Drawing Revision Log
            </h1>
            <p className="text-muted-foreground text-sm">
              Track all drawing revisions and version history
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex-1 sm:flex-initial"
          >
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden xs:inline">Export</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="flex-1 sm:flex-initial">
                <Plus className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/${projectId}/drawings/upload`)}>
                Upload New Revision
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/${projectId}/drawings/bulk-upload`)}>
                Bulk Upload
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/${projectId}/drawings/areas`)}>
                Manage Areas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 mt-6">
        <div className="p-4 bg-card border rounded-lg">
          <div className="text-2xl font-bold text-foreground">
            {revisions.length}
          </div>
          <div className="text-sm text-muted-foreground">Total Revisions</div>
        </div>

        <div className="p-4 bg-card border rounded-lg">
          <div className="text-2xl font-bold text-foreground">
            {revisions.filter(r => r.status === 'active').length}
          </div>
          <div className="text-sm text-muted-foreground">Active Revisions</div>
        </div>

        <div className="p-4 bg-card border rounded-lg">
          <div className="text-2xl font-bold text-foreground">
            {revisions.filter(r => r.approval_status === 'approved').length}
          </div>
          <div className="text-sm text-muted-foreground">Approved</div>
        </div>

        <div className="p-4 bg-card border rounded-lg">
          <div className="text-2xl font-bold text-foreground">
            {revisions.filter(r => r.approval_status === 'pending').length}
          </div>
          <div className="text-sm text-muted-foreground">Pending Review</div>
        </div>
      </div>

      {/* Drawing Log Table */}
      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading drawing revisions...</div>
          </div>
        ) : (
          <DrawingLogTable
            data={revisions}
            onViewDrawing={handleViewDrawing}
            onGenerateQR={handleGenerateQR}
            onDownload={handleDownloadRevision}
            onDelete={handleDeleteRevision}
            isLoading={false}
          />
        )}
      </div>
    </TableLayout>
  );
}