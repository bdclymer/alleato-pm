"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { Annotation } from "@/components/drawings/OsdDrawingViewer";
import {
  annotationToBody,
  rowToAnnotation,
  type DrawingAnnotationRow,
} from "@/lib/drawings/annotation-serialization";

function annotationsKey(projectId: string, drawingId: string) {
  return ["drawing-annotations", projectId, drawingId] as const;
}

export function useDrawingAnnotations(projectId: string, drawingId: string) {
  return useQuery<Annotation[]>({
    queryKey: annotationsKey(projectId, drawingId),
    queryFn: async ({ signal }) => {
      const res = await apiFetch<{ annotations?: DrawingAnnotationRow[] }>(
        `/api/projects/${projectId}/drawings/${drawingId}/annotations`,
        { signal },
      );
      return (res.annotations ?? []).map(rowToAnnotation);
    },
    enabled: !!projectId && !!drawingId,
    // Markup is seeded into the viewer's editing state; refetching on focus
    // would clobber a shape drawn since the last load.
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

export function useCreateDrawingAnnotation(projectId: string, drawingId: string) {
  return useMutation<Annotation, Error, Annotation>({
    mutationFn: async (annotation) => {
      const res = await apiFetch<{ annotation: DrawingAnnotationRow }>(
        `/api/projects/${projectId}/drawings/${drawingId}/annotations`,
        { method: "POST", body: JSON.stringify(annotationToBody(annotation)) },
      );
      return rowToAnnotation(res.annotation);
    },
    onError: (e) =>
      toast.error("Markup could not be saved", { description: e.message }),
  });
}

export function useDeleteDrawingAnnotation(projectId: string, drawingId: string) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: (annotationId) =>
      apiFetch(
        `/api/projects/${projectId}/drawings/${drawingId}/annotations/${annotationId}`,
        { method: "DELETE" },
      ),
    onError: (e) => {
      toast.error("Markup could not be removed", { description: e.message });
      qc.invalidateQueries({ queryKey: annotationsKey(projectId, drawingId) });
    },
  });
}
