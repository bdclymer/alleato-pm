"use client";

import * as React from "react";
import { LiveblocksProvider } from "@liveblocks/react/suspense";

import { apiFetch } from "@/lib/api-client";

// Resolves Liveblocks user ids -> display info so comment threads, mentions, and
// inbox notifications render names instead of raw ids. Backed by
// /api/liveblocks/users, which returns records in the SAME ORDER as the ids.
async function resolveUsers(userIds: readonly string[]) {
  if (userIds.length === 0) return [];
  const data = await apiFetch<{ users: ({ name: string } | null)[] }>(
    `/api/liveblocks/users?ids=${encodeURIComponent(userIds.join(","))}`,
  );
  return data.users.map((user) => user ?? undefined);
}

// Powers the "@" mention menu in the comment composer — returns teammate user
// ids matching the typed text. Backed by /api/liveblocks/mentions. Best-effort:
// returns [] on any failure so the composer never breaks.
async function resolveMentionSuggestions({ text }: { text: string }) {
  try {
    const data = await apiFetch<{ users: string[] }>(
      `/api/liveblocks/mentions?text=${encodeURIComponent(text)}`,
    );
    return data.users;
  } catch {
    return [];
  }
}

// A Liveblocks connection failure must never take the app down with it. The
// provider sits high in the tree (wraps the whole authenticated app), so we
// swallow render errors and fall back to rendering children with no provider —
// comments/notifications simply go quiet.
class SilentBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* intentionally silent — collaboration is non-critical */
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * The single, app-level Liveblocks provider. Mounted once in the authenticated
 * `(main)` layout so the notification inbox (header bell + /notifications) stays
 * live, and so every comment surface (page overlay, entity comments) shares one
 * provider instead of each mounting its own. Notifications work at this level
 * with no room required; comment surfaces add their own `RoomProvider` beneath.
 */
export function CollaborationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SilentBoundary fallback={children}>
      <LiveblocksProvider
        authEndpoint="/api/liveblocks/auth"
        resolveUsers={({ userIds }) => resolveUsers(userIds)}
        resolveMentionSuggestions={resolveMentionSuggestions}
      >
        {children}
      </LiveblocksProvider>
    </SilentBoundary>
  );
}
