"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { BoardStatus } from "@/lib/admin-feedback/constants";

export interface BoardItem {
  id: string;
  title: string;
  comment: string;
  request_type: string;
  board_status: BoardStatus;
  severity: string | null;
  created_at: string;
  page_title: string | null;
  page_path: string;
  created_by: string;
}

export function useProductBoard() {
  const queryClient = useQueryClient();

  const query = useQuery<{ items: BoardItem[] }>({
    queryKey: ["product-board"],
    queryFn: () => apiFetch("/api/admin/feedback/board"),
  });

  const mutation = useMutation({
    mutationFn: ({ id, board_status }: { id: string; board_status: BoardStatus }) =>
      apiFetch(`/api/admin/feedback/board/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ board_status }),
      }),
    onMutate: async ({ id, board_status }) => {
      await queryClient.cancelQueries({ queryKey: ["product-board"] });
      const previous = queryClient.getQueryData<{ items: BoardItem[] }>(["product-board"]);
      queryClient.setQueryData<{ items: BoardItem[] }>(["product-board"], (old) => ({
        items: (old?.items ?? []).map((item) =>
          item.id === id ? { ...item, board_status } : item
        ),
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["product-board"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["product-board"] });
    },
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  const updateStatus = useCallback(
    (id: string, board_status: BoardStatus) => mutation.mutate({ id, board_status }),
    [mutation]
  );

  return {
    items: query.data?.items ?? [],
    isLoading: query.isLoading,
    error: query.error,
    activeId,
    setActiveId,
    updateStatus,
  };
}
