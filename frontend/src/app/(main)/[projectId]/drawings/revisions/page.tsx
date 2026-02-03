"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { DrawingLogTable } from "@/components/drawings/DrawingLogTable";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDrawings, useDeleteDrawing } from "@/hooks/use-drawings";

export default function DrawingRevisionsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { data: drawingsResponse, isLoading, error, refetch } = useDrawings(projectId);
  const drawings = drawingsResponse?.drawings || [];

  const deleteDrawing = useDeleteDrawing(projectId);

  const handleDeleteDrawing = useCallback(async (drawingId: string) => {
    if (!confirm("Are you sure you want to delete this drawing? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteDrawing.mutateAsync(drawingId);
      toast.success("Drawing deleted successfully");
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete drawing";
      toast.error(message);
    }
  }, [deleteDrawing, refetch]);

  if (error) {
    return (
      <>
        <PageHeader
          title="Drawing Revision Log"
          description="Track all drawing revisions and version history"
        />
        <PageContainer>
          <div className="text-center text-destructive p-6">
            Error loading drawing revisions: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Drawing Revision Log"
        description="Track all drawing revisions and version history"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden xs:inline">Export</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
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
        }
      />

      <PageContainer>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-card border rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {drawings.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Revisions</div>
          </div>

          <div className="p-4 bg-card border rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {drawings.filter(r => r.status === 'approved').length}
            </div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </div>

          <div className="p-4 bg-card border rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {drawings.filter(r => r.status === 'under_review').length}
            </div>
            <div className="text-sm text-muted-foreground">Under Review</div>
          </div>

          <div className="p-4 bg-card border rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {drawings.filter(r => r.status === 'draft').length}
            </div>
            <div className="text-sm text-muted-foreground">Draft</div>
          </div>
        </div>

        {/* Drawing Log Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading drawing revisions...</div>
          </div>
        ) : (
          <DrawingLogTable
            data={drawings}
            projectId={projectId}
            isLoading={isLoading}
            onRefresh={() => refetch()}
            onDeleteDrawing={handleDeleteDrawing}
          />
        )}
      </PageContainer>
    </>
  );
}
