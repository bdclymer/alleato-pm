"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export interface BoardItemMeta {
  links?: BoardItemLink[];
  upvotes?: number;
}

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
