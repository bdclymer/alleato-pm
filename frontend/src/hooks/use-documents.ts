"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

export interface ProjectDocument {
  id: number;
  project_id: number;
  folder: string | null;
  title: string;
  description: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  content_type: string | null;
  version: number | null;
  status: "Draft" | "Published" | "Superseded" | "Archived";
  category: string | null;
  is_private: boolean | null;
  uploaded_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface CreateDocumentInput {
  title: string;
  description?: string | null;
  folder?: string | null;
  file_name: string;
  file_url: string;
  file_size?: number | null;
  content_type?: string | null;
  version?: number | null;
  status?: "Draft" | "Published" | "Superseded" | "Archived";
  category?: string | null;
  is_private?: boolean | null;
  uploaded_by?: string | null;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string | null;
  folder?: string | null;
  file_name?: string;
  file_url?: string;
  file_size?: number | null;
  content_type?: string | null;
  version?: number | null;
  status?: "Draft" | "Published" | "Superseded" | "Archived";
  category?: string | null;
  is_private?: boolean | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}

// =============================================================================
// Query Keys
// =============================================================================

export const documentKeys = {
  all: (projectId: number) => ["documents", projectId] as const,
  list: (projectId: number, folder?: string) =>
    ["documents", projectId, "list", folder] as const,
  detail: (projectId: number, id: string) =>
    ["documents", projectId, "detail", id] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

export function useDocuments(projectId: number, folder?: string) {
  const params = new URLSearchParams();
  if (folder) params.set("folder", folder);
  const queryString = params.toString();
  const url = `/api/projects/${projectId}/documents${queryString ? `?${queryString}` : ""}`;

  return useQuery<ProjectDocument[]>({
    queryKey: documentKeys.list(projectId, folder),
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch documents");
      }
      return res.json();
    },
    enabled: !!projectId,
  });
}

export function useDocument(projectId: number, documentId: string) {
  return useQuery<ProjectDocument>({
    queryKey: documentKeys.detail(projectId, documentId),
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/documents/${documentId}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch document");
      }
      return res.json();
    },
    enabled: !!projectId && !!documentId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useCreateDocument(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDocumentInput) => {
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create document");
      }
      return res.json() as Promise<ProjectDocument>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: documentKeys.all(projectId),
      });
      toast.success("Document created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create document: ${error.message}`);
    },
  });
}

export function useUpdateDocument(projectId: number, documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateDocumentInput) => {
      const res = await fetch(
        `/api/projects/${projectId}/documents/${documentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update document");
      }
      return res.json() as Promise<ProjectDocument>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: documentKeys.all(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: documentKeys.detail(projectId, documentId),
      });
      toast.success("Document updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update document: ${error.message}`);
    },
  });
}

export function useDeleteDocument(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/documents/${documentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete document");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: documentKeys.all(projectId),
      });
      toast.success("Document deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete document: ${error.message}`);
    },
  });
}
