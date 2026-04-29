"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { DrawingLogTableRow } from "@/types/drawings.types";
import { mapDrawingLogRow } from "@/types/drawings.types";
import type { DrawingLogViewRow } from "@/types/drawings.types";
import type {
  DrawingFilters,
  DrawingListResponse,
  DrawingWithRevision,
} from "@/services/DrawingService";

// Mapped response type with camelCase drawings
interface MappedDrawingListResponse extends Omit<DrawingListResponse, 'drawings'> {
  drawings: DrawingLogTableRow[];
}

interface DeletedDrawingsResponse {
  drawings?: DrawingLogViewRow[];
}

export interface DeletedDrawingRow extends DrawingLogTableRow {
  deletedAt: string | null;
}

/**
 * React Query hook for fetching drawings list
 */
export function useDrawings(projectId: string, filters?: DrawingFilters) {
  return useQuery<MappedDrawingListResponse>({
    queryKey: ["drawings", projectId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.area_id) params.set("area_id", filters.area_id);
      if (filters?.discipline) params.set("discipline", filters.discipline);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.set_id) params.set("set_id", filters.set_id);
      if (filters?.page) params.set("page", filters.page.toString());
      if (filters?.page_size)
        params.set("page_size", filters.page_size.toString());
      if (filters?.include_unpublished)
        params.set("include_unpublished", "true");
      if (filters?.include_obsolete)
        params.set("include_obsolete", "true");

      const data = await apiFetch<DrawingListResponse>(
        `/api/projects/${projectId}/drawings?${params}`,
      );

      // Map snake_case rows to camelCase
      return {
        ...data,
        drawings: data.drawings.map(mapDrawingLogRow),
      };
    },
    enabled: !!projectId,
  });
}

/**
 * React Query hook for fetching a single drawing with revision
 */
export function useDrawing(projectId: string, drawingId: string) {
  return useQuery<DrawingWithRevision>({
    queryKey: ["drawing", projectId, drawingId],
    queryFn: async () =>
      apiFetch<DrawingWithRevision>(
        `/api/projects/${projectId}/drawings/${drawingId}`,
      ),
    enabled: !!projectId && !!drawingId,
  });
}

/**
 * React Query mutation for creating a drawing with file upload
 */
export function useCreateDrawing(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) =>
      apiFetch<DrawingWithRevision>(
        `/api/projects/${projectId}/drawings`,
        {
          method: "POST",
          body: formData,
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawings", projectId],
      });
      toast.success("Drawing created successfully");
    },
    onError: (error: Error) => {
      toast.error("Could not create drawing", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query mutation for updating a drawing
 */
export function useUpdateDrawing(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      drawingId,
      data,
    }: {
      drawingId: string;
      data: {
        drawing_number?: string;
        title?: string;
        discipline?: string;
        drawing_type?: string;
        area_id?: string;
      };
    }) =>
      apiFetch<DrawingWithRevision>(
        `/api/projects/${projectId}/drawings/${drawingId}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["drawings", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["drawing", projectId, variables.drawingId],
      });
      toast.success("Drawing updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Could not update drawing", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query mutation for uploading a new revision to an existing drawing
 */
export function useUploadRevision(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      drawingId,
      formData,
    }: {
      drawingId: string;
      formData: FormData;
    }) =>
      apiFetch<DrawingWithRevision>(
        `/api/projects/${projectId}/drawings/${drawingId}/revisions`,
        {
          method: "POST",
          body: formData,
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drawings", projectId] });
    },
  });
}

/**
 * React Query mutation for deleting a drawing
 */
export function useDeleteDrawing(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (drawingId: string) =>
      apiFetch(
        `/api/projects/${projectId}/drawings/${drawingId}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawings", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["drawings-recycle-bin", projectId],
      });
      toast.success("Drawing moved to Recycle Bin");
    },
    onError: (error: Error) => {
      toast.error("Could not delete drawing", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query mutation for publishing or unpublishing a drawing
 */
export function usePublishDrawing(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ drawingId, publish }: { drawingId: string; publish: boolean }) =>
      apiFetch(
        `/api/projects/${projectId}/drawings/${drawingId}/publish`,
        { method: publish ? "PATCH" : "DELETE" },
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["drawings", projectId] });
      queryClient.invalidateQueries({ queryKey: ["drawing", projectId, variables.drawingId] });
      toast.success("Drawing updated");
    },
    onError: (error: Error) => {
      toast.error("Could not update drawing", { description: error.message });
    },
  });
}

/**
 * React Query mutation for marking a drawing obsolete or restoring it
 */
export function useObsoleteDrawing(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ drawingId, obsolete }: { drawingId: string; obsolete: boolean }) =>
      apiFetch(
        `/api/projects/${projectId}/drawings/${drawingId}/obsolete`,
        { method: obsolete ? "PATCH" : "DELETE" },
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["drawings", projectId] });
      queryClient.invalidateQueries({ queryKey: ["drawing", projectId, variables.drawingId] });
      toast.success("Drawing updated");
    },
    onError: (error: Error) => {
      toast.error("Could not update drawing", { description: error.message });
    },
  });
}

/**
 * React Query hook for fetching soft-deleted drawings (recycle bin)
 */
export function useDeletedDrawings(projectId: string) {
  return useQuery<DeletedDrawingRow[]>({
    queryKey: ["drawings-recycle-bin", projectId],
    queryFn: async () => {
      const rows = await apiFetch<DrawingLogViewRow[]>(
        `/api/projects/${projectId}/drawings/recycle-bin`,
      );
      return (rows ?? []).map((row) => ({
        ...mapDrawingLogRow(row),
        deletedAt: row.deleted_at ?? null,
      }));
    },
    enabled: !!projectId,
  });
}

/**
 * React Query mutation for restoring a soft-deleted drawing
 */
export function useRestoreDrawing(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (drawingId: string) =>
      apiFetch(
        `/api/projects/${projectId}/drawings/${drawingId}/restore`,
        { method: "PATCH" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drawings", projectId] });
      queryClient.invalidateQueries({ queryKey: ["drawings-recycle-bin", projectId] });
      toast.success("Drawing restored successfully");
    },
    onError: (error: Error) => {
      toast.error("Could not restore drawing", { description: error.message });
    },
  });
}

/**
 * React Query mutation for permanently deleting a drawing
 */
export function usePermanentDeleteDrawing(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (drawingId: string) =>
      apiFetch(
        `/api/projects/${projectId}/drawings/${drawingId}/restore`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drawings-recycle-bin", projectId] });
      toast.success("Drawing permanently deleted");
    },
    onError: (error: Error) => {
      toast.error("Could not delete drawing", { description: error.message });
    },
  });
}

// ─── Related Items ─────────────────────────────────────────────────────────

export interface DrawingRelatedItem {
  id: string;
  drawing_id: string;
  related_id: string;
  related_type: string;
  created_at: string;
  created_by: string;
}

interface RelatedItemsResponse {
  items: DrawingRelatedItem[];
}

/**
 * Fetch all related items linked to a drawing
 */
export function useDrawingRelatedItems(projectId: string, drawingId: string) {
  return useQuery<DrawingRelatedItem[]>({
    queryKey: ["drawing-related-items", projectId, drawingId],
    queryFn: async () => {
      const data = await apiFetch<RelatedItemsResponse>(
        `/api/projects/${projectId}/drawings/${drawingId}/related-items`,
      );
      return data.items;
    },
    enabled: !!projectId && !!drawingId,
  });
}

/**
 * Link a related item to a drawing
 */
export function useAddRelatedItem(projectId: string, drawingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { related_id: string; related_type: string }) =>
      apiFetch<{ item: DrawingRelatedItem }>(
        `/api/projects/${projectId}/drawings/${drawingId}/related-items`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawing-related-items", projectId, drawingId],
      });
      toast.success("Item linked to drawing");
    },
    onError: (error: Error) => {
      toast.error("Could not link item", { description: error.message });
    },
  });
}

/**
 * Remove a related item link from a drawing
 */
export function useRemoveRelatedItem(projectId: string, drawingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) =>
      apiFetch(
        `/api/projects/${projectId}/drawings/${drawingId}/related-items/${itemId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawing-related-items", projectId, drawingId],
      });
      toast.success("Item unlinked from drawing");
    },
    onError: (error: Error) => {
      toast.error("Could not unlink item", { description: error.message });
    },
  });
}

// ─── Sketches ─────────────────────────────────────────────────────────────

export interface DrawingSketchWithUrl {
  id: string;
  drawing_revision_id: string;
  sketch_number: string;
  name: string;
  description: string | null;
  sketch_date: string | null;
  file_url: string;
  signed_url: string | null;
  created_at: string;
  created_by: string;
}

interface SketchesResponse {
  sketches: DrawingSketchWithUrl[];
}

/**
 * Fetch all sketches for a drawing revision
 */
export function useRevisionSketches(
  projectId: string,
  drawingId: string,
  revisionId: string,
) {
  return useQuery<DrawingSketchWithUrl[]>({
    queryKey: ["drawing-sketches", projectId, drawingId, revisionId],
    queryFn: async () => {
      const data = await apiFetch<SketchesResponse>(
        `/api/projects/${projectId}/drawings/${drawingId}/revisions/${revisionId}/sketches`,
      );
      return data.sketches;
    },
    enabled: !!projectId && !!drawingId && !!revisionId,
  });
}

/**
 * Upload a new sketch to a drawing revision
 */
export function useAddSketch(
  projectId: string,
  drawingId: string,
  revisionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) =>
      apiFetch<{ sketch: DrawingSketchWithUrl }>(
        `/api/projects/${projectId}/drawings/${drawingId}/revisions/${revisionId}/sketches`,
        { method: "POST", body: formData },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawing-sketches", projectId, drawingId, revisionId],
      });
      toast.success("Sketch uploaded");
    },
    onError: (error: Error) => {
      toast.error("Could not upload sketch", { description: error.message });
    },
  });
}

/**
 * Delete a sketch from a drawing revision
 */
export function useDeleteSketch(
  projectId: string,
  drawingId: string,
  revisionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sketchId: string) =>
      apiFetch(
        `/api/projects/${projectId}/drawings/${drawingId}/revisions/${revisionId}/sketches/${sketchId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawing-sketches", projectId, drawingId, revisionId],
      });
      toast.success("Sketch deleted");
    },
    onError: (error: Error) => {
      toast.error("Could not delete sketch", { description: error.message });
    },
  });
}

// ─── Change History ────────────────────────────────────────────────────────

export interface DrawingChangeEvent {
  id: string;
  drawing_id: string;
  project_id: number;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_type: string;
}

interface ChangeHistoryResponse {
  history: DrawingChangeEvent[];
}

/**
 * Fetch the change history audit trail for a drawing
 */
export function useDrawingChangeHistory(projectId: string, drawingId: string) {
  return useQuery<DrawingChangeEvent[]>({
    queryKey: ["drawing-change-history", projectId, drawingId],
    queryFn: async () => {
      const data = await apiFetch<ChangeHistoryResponse>(
        `/api/projects/${projectId}/drawings/${drawingId}/change-history`,
      );
      return data.history;
    },
    enabled: !!projectId && !!drawingId,
  });
}
