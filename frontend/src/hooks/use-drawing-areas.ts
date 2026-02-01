"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { 
  DrawingArea, 
  DrawingAreaWithCount, 
  DrawingAreaFormData, 
  UseDrawingAreasReturn 
} from "@/types/drawings.types";

const supabase = createClient();

/**
 * Custom hook for managing drawing areas with hierarchical support
 * Provides CRUD operations for drawing folders/areas with proper nesting
 */
export function useDrawingAreas(projectId: string): UseDrawingAreasReturn {
  const [areas, setAreas] = useState<DrawingAreaWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAreas = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch areas with drawing counts using the materialized view
      const { data, error } = await supabase
        .from('drawing_areas_with_counts')
        .select('*')
        .eq('project_id', parseInt(projectId))
        .order('sort_order', { ascending: true });

      if (error) throw error;

      setAreas(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch drawing areas";
      setError(new Error(errorMessage));
      console.error("Drawing areas fetch error:", err);
      toast.error("Failed to load drawing areas", {
        description: "Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Fetch areas on mount and when projectId changes
  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const createArea = useCallback(async (formData: DrawingAreaFormData): Promise<DrawingArea> => {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    try {
      // Calculate next sort order
      const maxSortOrder = areas.reduce((max, area) => {
        if (formData.parentAreaId) {
          // If creating a child area, find max within that parent
          return area.parentAreaId === formData.parentAreaId ? Math.max(max, area.sortOrder) : max;
        } else {
          // If creating a root area, find max among root areas
          return !area.parentAreaId ? Math.max(max, area.sortOrder) : max;
        }
      }, -1);

      const areaData = {
        project_id: parseInt(projectId),
        name: formData.name,
        description: formData.description || null,
        parent_area_id: formData.parentAreaId || null,
        sort_order: maxSortOrder + 1,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };

      const { data, error } = await supabase
        .from('drawing_areas')
        .insert(areaData)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error("No data returned from insert");

      toast.success("Drawing area created", {
        description: `"${formData.name}" has been created successfully.`
      });

      // Refresh areas list
      await fetchAreas();

      return data as DrawingArea;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create drawing area";
      toast.error("Failed to create area", {
        description: errorMessage
      });
      throw new Error(errorMessage);
    }
  }, [projectId, areas, fetchAreas]);

  const updateArea = useCallback(async (id: string, formData: Partial<DrawingAreaFormData>): Promise<DrawingArea> => {
    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (formData.name !== undefined) updateData.name = formData.name;
      if (formData.description !== undefined) updateData.description = formData.description || null;
      if (formData.parentAreaId !== undefined) updateData.parent_area_id = formData.parentAreaId || null;
      if (formData.sortOrder !== undefined) updateData.sort_order = formData.sortOrder;

      const { data, error } = await supabase
        .from('drawing_areas')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error("No data returned from update");

      toast.success("Drawing area updated", {
        description: `"${data.name}" has been updated successfully.`
      });

      // Refresh areas list
      await fetchAreas();

      return data as DrawingArea;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update drawing area";
      toast.error("Failed to update area", {
        description: errorMessage
      });
      throw new Error(errorMessage);
    }
  }, [fetchAreas]);

  const deleteArea = useCallback(async (id: string): Promise<void> => {
    try {
      // First check if area has children or drawings
      const [childrenResult, drawingsResult] = await Promise.all([
        supabase.from('drawing_areas').select('id').eq('parent_area_id', id).limit(1),
        supabase.from('drawings').select('id').eq('area_id', id).limit(1)
      ]);

      if (childrenResult.error) throw childrenResult.error;
      if (drawingsResult.error) throw drawingsResult.error;

      if (childrenResult.data && childrenResult.data.length > 0) {
        throw new Error("Cannot delete area that contains sub-areas. Please delete or move sub-areas first.");
      }

      if (drawingsResult.data && drawingsResult.data.length > 0) {
        throw new Error("Cannot delete area that contains drawings. Please delete or move drawings first.");
      }

      const { error } = await supabase
        .from('drawing_areas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Drawing area deleted", {
        description: "The area has been deleted successfully."
      });

      // Refresh areas list
      await fetchAreas();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete drawing area";
      toast.error("Failed to delete area", {
        description: errorMessage
      });
      throw new Error(errorMessage);
    }
  }, [fetchAreas]);

  const reorderAreas = useCallback(async (
    sourceId: string, 
    targetId: string, 
    position: 'before' | 'after' | 'inside'
  ): Promise<void> => {
    try {
      const sourceArea = areas.find(a => a.id === sourceId);
      const targetArea = areas.find(a => a.id === targetId);

      if (!sourceArea || !targetArea) {
        throw new Error("Source or target area not found");
      }

      let newParentId: string | null;
      let newSortOrder: number;

      switch (position) {
        case 'inside':
          newParentId = targetId;
          // Find max sort order among target's children
          const targetChildren = areas.filter(a => a.parentAreaId === targetId);
          newSortOrder = targetChildren.reduce((max, child) => Math.max(max, child.sortOrder), -1) + 1;
          break;
        
        case 'before':
          newParentId = targetArea.parentAreaId;
          newSortOrder = targetArea.sortOrder;
          // Need to increment sort order of target and subsequent items
          break;
        
        case 'after':
          newParentId = targetArea.parentAreaId;
          newSortOrder = targetArea.sortOrder + 1;
          // Need to increment sort order of subsequent items
          break;
      }

      // For 'before' and 'after', we need to update sort orders of other areas
      if (position !== 'inside') {
        const affectedAreas = areas.filter(a => 
          a.parentAreaId === newParentId && 
          a.sortOrder >= newSortOrder &&
          a.id !== sourceId
        );

        // Update sort orders in batch
        for (const area of affectedAreas) {
          await supabase
            .from('drawing_areas')
            .update({ sort_order: area.sortOrder + 1 })
            .eq('id', area.id);
        }
      }

      // Update the source area
      await supabase
        .from('drawing_areas')
        .update({ 
          parent_area_id: newParentId, 
          sort_order: newSortOrder 
        })
        .eq('id', sourceId);

      toast.success("Drawing areas reordered", {
        description: "The area has been moved successfully."
      });

      // Refresh areas list
      await fetchAreas();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reorder drawing areas";
      toast.error("Failed to reorder areas", {
        description: errorMessage
      });
      throw new Error(errorMessage);
    }
  }, [areas, fetchAreas]);

  return {
    areas,
    isLoading,
    error,
    createArea,
    updateArea,
    deleteArea,
    reorderAreas,
  };
}

/**
 * Hook for getting a specific drawing area by ID
 */
export function useDrawingArea(areaId: string) {
  const [area, setArea] = useState<DrawingArea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchArea = async () => {
      if (!areaId) return;

      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('drawing_areas')
          .select('*')
          .eq('id', areaId)
          .single();

        if (error) throw error;
        setArea(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch drawing area";
        setError(new Error(errorMessage));
        console.error("Drawing area fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArea();
  }, [areaId]);

  return { area, isLoading, error };
}
