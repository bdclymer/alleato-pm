"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KnowledgeDocument {
  id: string;
  title: string | null;
  category: string | null;
  source: string | null;
  status: string | null;
  tags: string | null; // comma-separated string (NOT string[])
  date: string | null;
  file_name: string | null;
  file_path: string | null;
  project_id: number | null;
  created_at: string | null;
}

export interface KnowledgeDocumentFilters {
  search?: string;
  projectId?: number;
  manage?: boolean;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const knowledgeDocumentKeys = {
  all: ["knowledge-documents"] as const,
  list: (filters?: KnowledgeDocumentFilters) =>
    ["knowledge-documents", "list", filters] as const,
};

// ---------------------------------------------------------------------------
// useKnowledgeDocuments — list knowledge documents
// ---------------------------------------------------------------------------

export function useKnowledgeDocuments(filters?: KnowledgeDocumentFilters) {
  const params = new URLSearchParams();
  if (filters?.search) {
    params.set("search", filters.search);
  }
  if (filters?.projectId) {
    params.set("projectId", String(filters.projectId));
  }
  if (filters?.manage) {
    params.set("manage", "true");
  }

  return useQuery({
    queryKey: knowledgeDocumentKeys.list(filters),
    queryFn: async ({ signal }): Promise<KnowledgeDocument[]> => {
      const json = await apiFetch<{ data: KnowledgeDocument[] }>(
        `/api/knowledge?${params.toString()}`,
        { signal },
      );
      return json.data;
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteKnowledgeDocument
// ---------------------------------------------------------------------------

export function useDeleteKnowledgeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/knowledge?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeDocumentKeys.all });
      toast.success("Knowledge document deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
