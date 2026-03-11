"use client";

import React, { Component, type ReactNode } from "react";
import { LiveblocksProvider } from "@liveblocks/react/suspense";

/**
 * Error boundary that catches Liveblocks initialization failures
 * so the rest of the app continues to work.
 */
class LiveblocksErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[LiveblocksProvider] Failed to initialize:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.children;
    }
    return this.props.children;
  }
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LiveblocksErrorBoundary>
      <LiveblocksProvider
        authEndpoint="/api/liveblocks-auth"
        resolveUsers={async ({ userIds }) => {
          const res = await fetch(
            `/api/liveblocks/users?userIds=${userIds.join(",")}`
          );
          if (!res.ok) return [];
          return res.json();
        }}
        resolveMentionSuggestions={async ({ text }) => {
          const res = await fetch(
            `/api/liveblocks/users/search?text=${encodeURIComponent(text)}`
          );
          if (!res.ok) return [];
          return res.json();
        }}
        resolveRoomsInfo={async ({ roomIds }) => {
          const res = await fetch(
            `/api/liveblocks/rooms?roomIds=${roomIds.join(",")}`
          );
          if (!res.ok) return [];
          return res.json();
        }}
      >
        {children}
      </LiveblocksProvider>
    </LiveblocksErrorBoundary>
  );
}
