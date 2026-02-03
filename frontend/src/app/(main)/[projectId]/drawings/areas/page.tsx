"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Folder, Settings } from "lucide-react";
import { toast } from "sonner";
import { DrawingAreaSelector } from "@/components/drawings/DrawingAreaSelector";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";
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
        <PageHeader
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
      <PageHeader
        title="Drawing Areas"
        description="Organize your drawings into logical areas and subareas"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${projectId}/drawings/areas/settings`)}
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden xs:inline">Settings</span>
            </Button>

            <Button
              size="sm"
              onClick={() => handleCreateArea()}
              disabled={createArea.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Area
            </Button>
          </div>
        }
      />

      <PageContainer>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-card border rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {areas?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Areas</div>
          </div>

          <div className="p-4 bg-card border rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {areas?.reduce((sum, area) => sum + (area.drawing_count || 0), 0) || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Drawings</div>
          </div>

          <div className="p-4 bg-card border rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {areas?.filter(area => !area.parent_area_id).length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Root Areas</div>
          </div>
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
                <Plus className="h-4 w-4 mr-2" />
                Create First Area
              </Button>
            </div>
          )}
        </div>

        {/* Selected Area Info */}
        {selectedAreaId && areas && (
          <div className="mt-6 bg-card border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">
              Selected Area Details
            </h3>
            {(() => {
              const selectedArea = areas.find(area => area.id === selectedAreaId);
              if (!selectedArea) return null;

              return (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Name</div>
                    <div className="text-foreground">{selectedArea.name}</div>
                  </div>

                  {selectedArea.description && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Description</div>
                      <div className="text-foreground">{selectedArea.description}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Drawings</div>
                      <div className="text-foreground">{selectedArea.drawing_count || 0}</div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Sort Order</div>
                      <div className="text-foreground">{selectedArea.sort_order}</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/${projectId}/drawings?area=${selectedAreaId}`)}
                    >
                      View Drawings in This Area
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </PageContainer>
    </>
  );
}
