"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { RFI } from "@/types/database-extensions";
import type { RfiFormValues } from "@/lib/schemas/rfi-schema";

// =============================================================================
// Query Hook
// =============================================================================

export function useRfis(projectId: number) {
  return useQuery<RFI[]>({
    queryKey: ["rfis", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/rfis?projectId=${projectId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch RFIs");
      }
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: !!projectId,
  });
}

export function useRfi(rfiId: string) {
  return useQuery<RFI>({
    queryKey: ["rfi", rfiId],
    queryFn: async () => {
      const res = await fetch(`/api/rfis/${rfiId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch RFI");
      }
      return res.json();
    },
    enabled: !!rfiId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useCreateRfi(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: RfiFormValues & { status: string }) => {
      const res = await fetch("/api/rfis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, project_id: projectId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create RFI");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfis", projectId] });
      router.refresh();
      toast.success("RFI created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create RFI: ${error.message}`);
    },
  });
}

export function useUpdateRfi(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      rfiId,
      data,
    }: {
      rfiId: string;
      data: Partial<RfiFormValues> & { status?: string };
    }) => {
      const res = await fetch(`/api/rfis/${rfiId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update RFI");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rfis", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["rfi", variables.rfiId],
      });
      router.refresh();
      toast.success("RFI updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update RFI: ${error.message}`);
    },
  });
}

export function useDeleteRfi(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (rfiId: string) => {
      const res = await fetch(`/api/rfis/${rfiId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete RFI");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfis", projectId] });
      router.refresh();
      toast.success("RFI deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete RFI: ${error.message}`);
    },
  });
}
