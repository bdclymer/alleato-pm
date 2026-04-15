"use client";

import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api-client";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface CollaborationNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  createdAt: string;
  readAt: string | null;
  entityType: string | null;
  entityId: string | null;
  projectId: number | null;
}

interface NotificationsResponse {
  notifications: CollaborationNotification[];
  unreadCount: number;
  hasMore: boolean;
}

const PAGE_SIZE = 25;

export function useCollaborationNotifications() {
  const [notifications, setNotifications] = useState<CollaborationNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    return params;
  }, []);

  const fetchPage = useCallback(
    async ({ append, cursorValue }: { append: boolean; cursorValue?: string | null }) => {
      const params = new URLSearchParams(baseQuery);
      if (cursorValue) {
        params.set("cursor", cursorValue);
      }

      const data = await apiFetch<NotificationsResponse>(
        `/api/collaboration/notifications?${params.toString()}`,
        { cache: "no-store" },
      );
      setNotifications((prev) =>
        append ? [...prev, ...(data.notifications ?? [])] : data.notifications ?? [],
      );
      setUnreadCount(data.unreadCount ?? 0);
      setHasMore(Boolean(data.hasMore));

      const nextCursor = data.notifications?.at(-1)?.createdAt ?? null;
      setCursor(nextCursor);
    },
    [baseQuery],
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled) {
          setUserId(user?.id ?? null);
        }

        await fetchPage({ append: false, cursorValue: null });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collaboration_notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void fetchPage({ append: false, cursorValue: null });
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, fetchPage]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || !cursor || isFetchingMore) return;

    setIsFetchingMore(true);
    try {
      await fetchPage({ append: true, cursorValue: cursor });
    } finally {
      setIsFetchingMore(false);
    }
  }, [hasMore, cursor, isFetchingMore, fetchPage]);

  const mutate = useCallback(async (payload: Record<string, unknown>) => {
    await apiFetch("/api/collaboration/notifications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    await fetchPage({ append: false, cursorValue: null });
  }, [fetchPage]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isFetchingMore,
    hasMore,
    fetchMore,
    markAsRead: (id: string) => mutate({ action: "mark-read", id }),
    markAllAsRead: () => mutate({ action: "mark-all-read" }),
    deleteNotification: (id: string) => mutate({ action: "delete", id }),
    deleteAll: () => mutate({ action: "delete-all" }),
  };
}
