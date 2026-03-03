"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
    queryFn: async () => {
      const res = await fetch("/api/ai-assistant/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = await res.json();
      return data.conversations;
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/ai-assistant/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const details = body?.details ?? body?.error ?? "unknown error";
        console.error("[useCreateConversation] API error", res.status, body);
        throw new Error(details);
      }
      const data = await res.json();
      return data.conversation as RagConversation;
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
    mutationFn: async ({
      sessionId,
      title,
    }: {
      sessionId: string;
      title: string;
    }) => {
      const res = await fetch(
        `/api/ai-assistant/conversations/${sessionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        },
      );
      if (!res.ok) throw new Error("Failed to rename conversation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: () => {
      toast.error("Failed to rename conversation");
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(
        `/api/ai-assistant/conversations/${sessionId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete conversation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: () => {
      toast.error("Failed to delete conversation");
    },
  });
}
