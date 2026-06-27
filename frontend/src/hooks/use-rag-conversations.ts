"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

export interface RagConversation {
  session_id: string;
  title: string | null;
  last_message_at: string | null;
  created_at: string | null;
  metadata: Record<string, unknown> | null;
  is_pinned: boolean;
}

const QUERY_KEY = ["rag-conversations"];

export function useRagConversations() {
  return useQuery<RagConversation[]>({
    queryKey: QUERY_KEY,
    queryFn: async ({ signal }) => {
      const data = await apiFetch<{ conversations: RagConversation[] }>(
        "/api/ai-assistant/conversations",
        { signal },
      );
      return data.conversations;
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      const data = await apiFetch<{ conversation: RagConversation }>(
        "/api/ai-assistant/conversations",
        {
          method: "POST",
          body: JSON.stringify({ title }),
        },
      );
      return data.conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: Error) => {
      toast.error(`Failed to create conversation: ${err.message}`);
    },
  });
}

export function useRenameConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      title,
    }: {
      sessionId: string;
      title: string;
    }) =>
      apiFetch(`/api/ai-assistant/conversations/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useTogglePinConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      isPinned,
    }: {
      sessionId: string;
      isPinned: boolean;
    }) =>
      apiFetch(`/api/ai-assistant/conversations/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_pinned: isPinned }),
      }),
    onMutate: async ({ sessionId, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous =
        queryClient.getQueryData<RagConversation[]>(QUERY_KEY);
      queryClient.setQueryData<RagConversation[]>(QUERY_KEY, (current) =>
        (current ?? []).map((conversation) =>
          conversation.session_id === sessionId
            ? { ...conversation, is_pinned: isPinned }
            : conversation,
        ),
      );
      return { previous };
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
      toast.error(err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch(`/api/ai-assistant/conversations/${sessionId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
