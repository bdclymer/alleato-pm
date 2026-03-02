"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface RagMessage {
  id: string;
  role: string;
  content: string;
  sources: unknown[] | null;
  created_at: string | null;
}

export function useRagMessages(sessionId: string | null) {
  return useQuery<RagMessage[]>({
    queryKey: ["rag-messages", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const res = await fetch(
        `/api/ai-assistant/messages/${sessionId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      return data.messages;
    },
    enabled: !!sessionId,
  });
}

export function useSendRagMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      message,
    }: {
      sessionId: string;
      message: string;
    }) => {
      const res = await fetch("/api/ai-assistant/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json() as Promise<{
        response: string;
        sources: unknown[];
      }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["rag-messages", variables.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["rag-conversations"],
      });
    },
  });
}
