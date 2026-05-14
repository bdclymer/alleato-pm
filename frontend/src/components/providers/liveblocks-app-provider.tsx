"use client";

import type { ReactNode } from "react";
import { LiveblocksProvider } from "@liveblocks/react/suspense";

type ResolverFallback = [] | Record<string, unknown>[];

/** Fetches JSON for Liveblocks resolvers and returns a safe fallback on failure. */
async function safeResolverFetch<T extends ResolverFallback>(
  endpoint: string,
  fallback: T
): Promise<T> {
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      console.error(`[LiveblocksProvider] Resolver failed: ${endpoint}`, {
        status: response.status,
      });
      return fallback;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`[LiveblocksProvider] Resolver error: ${endpoint}`, error);
    return fallback;
  }
}

/** Provides Liveblocks context for app routes that use comments, mentions, and notifications. */
export function LiveblocksAppProvider({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      badgeLocation="bottom-left"
      resolveUsers={({ userIds }) =>
        safeResolverFetch(
          `/api/liveblocks/users?userIds=${userIds.join(",")}`,
          []
        )
      }
      resolveMentionSuggestions={({ text }) =>
        safeResolverFetch(
          `/api/liveblocks/users/search?text=${encodeURIComponent(text)}`,
          []
        )
      }
      resolveRoomsInfo={({ roomIds }) =>
        safeResolverFetch(
          `/api/liveblocks/rooms?roomIds=${roomIds.join(",")}`,
          []
        )
      }
    >
      {children}
    </LiveblocksProvider>
  );
}
