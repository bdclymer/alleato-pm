"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Folder, Settings } from "lucide-react";
import { toast } from "sonner";
import { DrawingAreaSelector } from "@/components/drawings/DrawingAreaSelector";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { KpiRow } from "@/components/ds";

import { Button } from "@/components/ui/button";
import { useDrawingAreas, useCreateDrawingArea, useUpdateDrawingArea, useDeleteDrawingArea } from "@/hooks/use-drawing-areas";
import type { DrawingAreaWithCount } from "@/types/drawings.types";

export default function DrawingAreasPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const { data: areas, isLoading, error } = useDrawingAreas(projectId);
  const createArea = useCreateDrawingArea(projectId);
  const updateArea = useUpdateDrawingArea(projectId);
  const deleteArea = useDeleteDrawingArea(projectId);

  const handleSelectArea = (areaId: string | null) => {
    setSelectedAreaId(areaId);
  };

  const handleCreateArea = async (parentId?: string) => {
    try {
      const newArea = await createArea.mutateAsync({
        name: "New Area",
        description: "",
        parentAreaId: parentId,
        sortOrder: 0,
      });

      toast.success("Drawing area created successfully");
      setSelectedAreaId(newArea.id);
    } catch (error) {
      toast.error("Failed to create drawing area");
      console.error("Error creating area:", error);
    }
  };

  const handleEditArea = async (area: DrawingAreaWithCount) => {
    toast.info("Edit functionality will be implemented in the DrawingAreaCard component");
  };

  const handleDeleteArea = async (area: DrawingAreaWithCount) => {
    if (!confirm(`Are you sure you want to delete "${area.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteArea.mutateAsync(area.id);
      toast.success("Drawing area deleted successfully");

      if (selectedAreaId === area.id) {
        setSelectedAreaId(null);
      }
    } catch (error) {
      toast.error("Failed to delete drawing area");
      console.error("Error deleting area:", error);
    }
  };

  if (error) {
    return (
      <>
        <ProjectPageHeader
          title="Drawing Areas"
          description="Organize your drawings into logical areas and subareas"
        />
        <PageContainer>
          <div className="text-center text-destructive p-6">
            Error loading drawing areas: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectPageHeader
        title="Drawing Areas"
        description="Organize your drawings into logical areas and subareas"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${projectId}/drawings/areas/settings`)}
            >
              <Settings className="sm:" />
              <span className="hidden xs:inline">Settings</span>
            </Button>

            <Button
              size="sm"
              onClick={() => handleCreateArea()}
              disabled={createArea.isPending}
            >
              <Plus />
              Create Area
            </Button>
          </div>
        }
      />

      <PageContainer>
        {/* Stats */}
        <div className="mb-4">
          <KpiRow metrics={[
            { label: "Total Areas", value: String(areas?.length || 0) },
            { label: "Total Drawings", value: String(areas?.reduce((sum, area) => sum + (area.drawing_count || 0), 0) || 0) },
            { label: "Root Areas", value: String(areas?.filter(area => !area.parent_area_id).length || 0) },
          ]} />
        </div>

        {/* Drawing Area Selector */}
        <div className="bg-card border rounded-lg p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading drawing areas...</div>
            </div>
          ) : areas && areas.length > 0 ? (
            <DrawingAreaSelector
              areas={areas}
              selectedAreaId={selectedAreaId ?? undefined}
              onSelectArea={handleSelectArea}
              onCreateArea={handleCreateArea}
              onEditArea={handleEditArea}
              onDeleteArea={handleDeleteArea}
              isLoading={createArea.isPending || updateArea.isPending || deleteArea.isPending}
            />
          ) : (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No drawing areas found
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Create your first drawing area to start organizing your project drawings
              </p>
              <Button
                onClick={() => handleCreateArea()}
                disabled={createArea.isPending}
              >
                <Plus />
                Create First Area
              </Button>
            </div>
          )}
        </div>

      </PageContainer>
    </>
  );
}
