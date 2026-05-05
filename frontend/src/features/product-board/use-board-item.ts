"use client";

import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { BoardStatus } from "@/lib/admin-feedback/constants";

export interface BoardComment {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  screenshot_url: string | null;
  user_profiles: { full_name: string | null; email: string } | null;
}

export interface BoardItemLink {
  id: string;
  url: string;
  label: string;
}

export interface BoardLabel {
  id: string;
  color: string; // tailwind bg class e.g. "bg-red-500"
  text: string;
}

export interface BoardItemMeta {
  links?: BoardItemLink[];
  upvotes?: number;
  labels?: BoardLabel[];
  due_date?: string | null;
}

// ── Comments ────────────────────────────────────────────────────────────────

export function useBoardItemComments(itemId: string) {
  return useQuery<{ comments: BoardComment[] }>({
    queryKey: ["board-item-comments", itemId],
    queryFn: () => apiFetch(`/api/admin/feedback/board/${itemId}/comments`),
    enabled: !!itemId,
  });
}

export function useAddComment(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      apiFetch(`/api/admin/feedback/board/${itemId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-item-comments", itemId] });
    },
  });
}

// ── Update ───────────────────────────────────────────────────────────────────

export function useUpdateBoardItem(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: {
      board_status?: BoardStatus;
      title?: string;
      comment?: string;
      severity?: "low" | "medium" | "high";
      metadata?: Partial<BoardItemMeta>;
    }) =>
      apiFetch(`/api/admin/feedback/board/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-board"] });
    },
  });
}

// ── Create ───────────────────────────────────────────────────────────────────

export function useCreateBoardItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: { title: string; board_status: BoardStatus; severity?: string }) =>
      apiFetch("/api/admin/feedback/board/create", {
        method: "POST",
        body: JSON.stringify(item),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-board"] });
    },
  });
}

// ── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteBoardItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch(`/api/admin/feedback/board/${itemId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-board"] });
    },
  });
}
