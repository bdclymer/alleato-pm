"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import {
  type RoadmapItem,
  type CreateRoadmapItemInput,
  type UpdateRoadmapItemInput,
  ROADMAP_PHASES,
  type RoadmapPhase,
} from "@/lib/schemas/roadmap-schema";

const QUERY_KEY = ["roadmap-items"];

export function useRoadmapItems() {
  return useQuery<RoadmapItem[]>({
    queryKey: QUERY_KEY,
    queryFn: ({ signal }) =>
      apiFetch<{ items: RoadmapItem[] }>("/api/admin/roadmap", { signal }).then(
        (res) => res.items
      ),
  });
}

/** Returns items grouped by phase in canonical phase order */
export function useRoadmapItemsByPhase() {
  const query = useRoadmapItems();
  const grouped: Record<RoadmapPhase, RoadmapItem[]> = {
    in_progress: [],
    immediate: [],
    high_priority: [],
    future: [],
  };
  for (const item of query.data ?? []) {
    grouped[item.phase as RoadmapPhase]?.push(item);
  }
  return { ...query, grouped };
}

export function useCreateRoadmapItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoadmapItemInput) =>
      apiFetch<{ item: RoadmapItem }>("/api/admin/roadmap", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((res) => res.item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Feature added to roadmap");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create item: ${error.message}`);
    },
  });
}

export function useUpdateRoadmapItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: UpdateRoadmapItemInput & { id: string }) =>
      apiFetch<{ item: RoadmapItem }>(`/api/admin/roadmap/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }).then((res) => res.item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Roadmap item updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });
}

export function useDeleteRoadmapItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/roadmap/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Roadmap item deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete item: ${error.message}`);
    },
  });
}

export function useReorderRoadmapItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Array<{ id: string; sort_order: number }>) =>
      Promise.all(
        updates.map(({ id, sort_order }) =>
          apiFetch(`/api/admin/roadmap/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ sort_order }),
          })
        )
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder: ${error.message}`);
    },
  });
}
