"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";

type PhotoAlbum = Database["public"]["Tables"]["photo_albums"]["Row"];

const albumKeys = {
  all: (projectId: number) => ["photo-albums", projectId] as const,
};

export function usePhotoAlbums(projectId: number) {
  return useQuery({
    queryKey: albumKeys.all(projectId),
    queryFn: async (): Promise<PhotoAlbum[]> => {
      const res = await fetch(`/api/projects/${projectId}/photo-albums`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: Boolean(projectId),
  });
}

export function useCreatePhotoAlbum(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string | null }): Promise<PhotoAlbum> => {
      const res = await fetch(`/api/projects/${projectId}/photo-albums`, {
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
      qc.invalidateQueries({ queryKey: albumKeys.all(projectId) });
      toast.success("Album created");
    },
    onError: (err: Error) => {
      toast.error("Could not create album", { description: err.message });
    },
  });
}

export function useRenamePhotoAlbum(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ albumId, name }: { albumId: string; name: string }): Promise<PhotoAlbum> => {
      const res = await fetch(`/api/projects/${projectId}/photo-albums/${albumId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: albumKeys.all(projectId) });
      toast.success("Album renamed");
    },
    onError: (err: Error) => {
      toast.error("Could not rename album", { description: err.message });
    },
  });
}

export function useDeletePhotoAlbum(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (albumId: string): Promise<void> => {
      const res = await fetch(`/api/projects/${projectId}/photo-albums/${albumId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: albumKeys.all(projectId) });
      toast.success("Album deleted");
    },
    onError: (err: Error) => {
      toast.error("Could not delete album", { description: err.message });
    },
  });
}
