"use client";

/**
 * BottomNavAlertBadge
 *
 * Unread-notification dot for the bottom nav's Alerts tab. Mirrors the header
 * bell's badge but is positioned for the tab icon.
 *
 * The Liveblocks `useUnreadInboxNotificationsCount` hook throws if the
 * `CollaborationProvider` is missing or fell back after a connection failure.
 * Both app shells that mount the nav (`(main)` and `(tables)`) wrap children in
 * the provider, so in normal operation the hook resolves. If it does throw
 * (genuine provider fallback), the boundary drops the badge rather than taking
 * the whole nav down — and it REPORTS the failure to the console so a missing
 * badge is diagnosable rather than an invisible no-op.
 */

import * as React from "react";
import { useUnreadInboxNotificationsCount } from "@liveblocks/react";

class BadgeBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    // Report, don't swallow: a throw here means the Liveblocks provider is
    // unavailable, so the unread count can't render. The badge is non-blocking
    // (the nav still works), but the degradation is logged for diagnosis.
    console.warn(
      "[MobileBottomNav] unread notification count unavailable — Liveblocks provider missing or disconnected:",
      error,
    );
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function UnreadDot() {
  const { count } = useUnreadInboxNotificationsCount();
  if (!count) return null;
  return (
    <span
      className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-none text-primary-foreground"
      aria-label={`${count} unread notifications`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function BottomNavAlertBadge() {
  return (
    <BadgeBoundary>
      <UnreadDot />
    </BadgeBoundary>
  );
}
