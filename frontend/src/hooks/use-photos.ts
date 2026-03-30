"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhotoSummary {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  album: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  content_type: string | null;
  width: number | null;
  height: number | null;
  date_taken: string | null;
  location: string | null;
  trade: string | null;
  tags: string[] | null;
  is_private: boolean | null;
  starred: boolean | null;
  uploaded_by: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface CreatePhotoInput {
  title: string;
  description?: string | null;
  album?: string | null;
  file_name: string;
  file_url: string;
  file_size?: number | null;
  content_type?: string | null;
  width?: number | null;
  height?: number | null;
  date_taken?: string | null;
  location?: string | null;
  trade?: string | null;
  tags?: string[] | null;
  is_private?: boolean | null;
  starred?: boolean | null;
}

export type UpdatePhotoInput = Partial<CreatePhotoInput>;

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const photoKeys = {
  all: (projectId: number) => ["photos", projectId] as const,
  list: (projectId: number, album?: string) =>
    ["photos", projectId, "list", album] as const,
  detail: (projectId: number, photoId: number) =>
    ["photos", projectId, "detail", photoId] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePhotos(projectId: number, album?: string) {
  return useQuery({
    queryKey: photoKeys.list(projectId, album),
    queryFn: async (): Promise<PhotoSummary[]> => {
      const params = new URLSearchParams();
      if (album) params.set("album", album);
      const res = await fetch(
        `/api/projects/${projectId}/photos?${params.toString()}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: Boolean(projectId),
  });
}

export function usePhoto(projectId: number, photoId: number) {
  return useQuery({
    queryKey: photoKeys.detail(projectId, photoId),
    queryFn: async (): Promise<PhotoSummary> => {
      const res = await fetch(
        `/api/projects/${projectId}/photos/${photoId}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: Boolean(projectId) && Boolean(photoId),
  });
}

export function useCreatePhoto(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePhotoInput): Promise<PhotoSummary> => {
      const res = await fetch(`/api/projects/${projectId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: photoKeys.all(projectId) });
      toast.success("Photo uploaded");
    },
    onError: (err: Error) => {
      toast.error("Could not upload photo", { description: err.message });
    },
  });
}

export function useUpdatePhoto(projectId: number, photoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePhotoInput): Promise<PhotoSummary> => {
      const res = await fetch(
        `/api/projects/${projectId}/photos/${photoId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: photoKeys.all(projectId) });
      toast.success("Photo updated");
    },
    onError: (err: Error) => {
      toast.error("Could not update photo", { description: err.message });
    },
  });
}

export function useDeletePhoto(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: number): Promise<void> => {
      const res = await fetch(
        `/api/projects/${projectId}/photos/${photoId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: photoKeys.all(projectId) });
      toast.success("Photo deleted");
    },
    onError: (err: Error) => {
      toast.error("Could not delete photo", { description: err.message });
    },
  });
}
