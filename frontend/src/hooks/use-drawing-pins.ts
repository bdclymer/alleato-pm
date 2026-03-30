"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface DrawingMarkupPin {
  id: string;
  drawing_id: string;
  project_id: number;
  x_pct: number;
  y_pct: number;
  page: number;
  pin_type: "rfi" | "punch_item" | "coordination_issue" | "drawing" | "document" | "photo" | "task";
  entity_id: string | null;
  entity_label: string | null;
  entity_number: string | null;
  entity_status: string | null;
  color: string | null;
  created_by: string | null;
  created_at: string;
}

export function useDrawingPins(projectId: string, drawingId: string) {
  return useQuery<DrawingMarkupPin[]>({
    queryKey: ["drawing-pins", projectId, drawingId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/drawings/${drawingId}/pins`);
      if (!res.ok) throw new Error("Failed to fetch pins");
      const data = await res.json();
      return data.pins ?? [];
    },
    enabled: !!projectId && !!drawingId,
  });
}

export interface CreatePinInput {
  x_pct: number;
  y_pct: number;
  page: number;
  pin_type: DrawingMarkupPin["pin_type"];
  entity_id?: string;
  entity_label?: string;
  entity_number?: string;
  entity_status?: string;
  color?: string;
}

export function useCreateDrawingPin(projectId: string, drawingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePinInput) => {
      const res = await fetch(`/api/projects/${projectId}/drawings/${drawingId}/pins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create pin");
      }
      return (await res.json()).pin as DrawingMarkupPin;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drawing-pins", projectId, drawingId] });
    },
    onError: (e: Error) => toast.error("Could not create pin", { description: e.message }),
  });
}

export function useDeleteDrawingPin(projectId: string, drawingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pinId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/drawings/${drawingId}/pins/${pinId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete pin");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drawing-pins", projectId, drawingId] });
      toast.success("Link removed");
    },
    onError: (e: Error) => toast.error("Could not remove pin", { description: e.message }),
  });
}
