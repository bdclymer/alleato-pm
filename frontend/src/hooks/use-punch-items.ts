"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";

type PunchItemRow = Database["public"]["Tables"]["punch_items"]["Row"];

// =============================================================================
// Query Hooks
// =============================================================================

interface UsePunchItemsOptions {
  status?: string;
  priority?: string;
  assignee_id?: string;
  is_deleted?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export function usePunchItems(
  projectId: number,
  options: UsePunchItemsOptions = {},
) {
  return useQuery({
    queryKey: ["punch-items", projectId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.status) params.set("status", options.status);
      if (options.priority) params.set("priority", options.priority);
      if (options.assignee_id) params.set("assignee_id", options.assignee_id);
      if (options.is_deleted !== undefined)
        params.set("is_deleted", String(options.is_deleted));
      if (options.search) params.set("search", options.search);
      if (options.page) params.set("page", String(options.page));
      if (options.page_size) params.set("page_size", String(options.page_size));

      const res = await fetch(
        `/api/projects/${projectId}/punch-items?${params.toString()}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch punch items");
      }
      return res.json();
    },
    enabled: !!projectId,
  });
}

export function usePunchItem(projectId: number, punchItemId: string) {
  return useQuery<PunchItemRow>({
    queryKey: ["punch-item", projectId, punchItemId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/punch-items/${punchItemId}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch punch item");
      }
      return res.json();
    },
    enabled: !!projectId && !!punchItemId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useCreatePunchItem(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (
      data: Partial<PunchItemRow> & { title: string },
    ) => {
      const res = await fetch(`/api/projects/${projectId}/punch-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create punch item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["punch-items", projectId] });
      router.refresh();
      toast.success("Punch item created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create punch item: ${error.message}`);
    },
  });
}

export function useUpdatePunchItem(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      punchItemId,
      data,
    }: {
      punchItemId: string;
      data: Partial<PunchItemRow>;
    }) => {
      const res = await fetch(
        `/api/projects/${projectId}/punch-items/${punchItemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update punch item");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["punch-items", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["punch-item", projectId, variables.punchItemId],
      });
      router.refresh();
      toast.success("Punch item updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update punch item: ${error.message}`);
    },
  });
}

export function useDeletePunchItem(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (punchItemId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/punch-items/${punchItemId}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete punch item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["punch-items", projectId] });
      router.refresh();
      toast.success("Punch item moved to recycle bin");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete punch item: ${error.message}`);
    },
  });
}

export function useRestorePunchItem(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (punchItemId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/punch-items/${punchItemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_deleted: false }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to restore punch item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["punch-items", projectId] });
      router.refresh();
      toast.success("Punch item restored");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore punch item: ${error.message}`);
    },
  });
}
