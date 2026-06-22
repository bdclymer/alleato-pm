"use client";

import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CommentableEntityType } from "@/lib/collaboration/rooms";

export interface CollaborationComment {
  id: string;
  body: string;
  parentCommentId: string | null;
  authorId: string;
  authorName: string;
  createdAt: string;
}

interface CommentsResponse {
  comments: CollaborationComment[];
}

export function useCollaborationComments({
  entityType,
  entityId,
  projectId,
}: {
  entityType: CommentableEntityType;
  entityId: string;
  projectId?: number;
}) {
  const [comments, setComments] = useState<CollaborationComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ entityType, entityId });
    if (typeof projectId === "number") {
      params.set("projectId", String(projectId));
    }
    return params.toString();
  }, [entityType, entityId, projectId]);

  const fetchComments = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<CommentsResponse>(
        `/api/collaboration/comments?${query}`,
        { cache: "no-store" },
      );
      setComments(data?.comments ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load comments.",
      );
    }
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    fetchComments()
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load comments.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    const supabase = createClient();
    const channel = supabase
      .channel(`comments:${entityType}:${entityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collaboration_comments",
        },
        ({ new: newRow, old: oldRow }) => {
          const target = (newRow ?? oldRow) as
            | { entity_type?: string; entity_id?: string }
            | null;

          if (
            target?.entity_type === entityType &&
            target?.entity_id === entityId
          ) {
            void fetchComments();
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      channel.unsubscribe();
    };
  }, [entityType, entityId, fetchComments]);

  const createComment = useCallback(
    async ({
      body,
      parentCommentId,
    }: {
      body: string;
      parentCommentId?: string | null;
    }) => {
      const payload = await apiFetch<{ warning?: string }>(
        "/api/collaboration/comments",
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entityType,
          entityId,
          projectId,
          body,
          parentCommentId: parentCommentId ?? null,
        }),
      });

      if (payload?.warning) {
        setError(payload.warning);
      }
    },
    [entityType, entityId, projectId],
  );

  return { comments, isLoading, error, createComment, refresh: fetchComments };
}
