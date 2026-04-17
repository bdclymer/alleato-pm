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
