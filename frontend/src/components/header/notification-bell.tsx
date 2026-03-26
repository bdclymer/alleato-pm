"use client";

import * as React from "react";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import {
  InboxNotification,
  InboxNotificationList,
} from "@liveblocks/react-ui";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { InboxNotificationData } from "@liveblocks/client";
import {
  ClientSideSuspense,
  useInboxNotifications,
  useUnreadInboxNotificationsCount,
  useMarkAllInboxNotificationsAsRead,
  useDeleteAllInboxNotifications,
  useMarkInboxNotificationAsRead,
  useDeleteInboxNotification,
} from "@liveblocks/react/suspense";
import { customNotificationKinds } from "@/components/notifications/custom-notification-kinds";

// ── Error boundary ──────────────────────────────────────────────────────────

class NotificationErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[NotificationBell] Liveblocks error:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

// ── Main component ──────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="relative h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
        onClick={() => setOpen(true)}
      >
        <Bell />
        <NotificationErrorBoundary>
          <ClientSideSuspense fallback={null}>
            <UnreadBadge />
          </ClientSideSuspense>
        </NotificationErrorBoundary>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-[420px] p-0 sm:max-w-[420px] flex flex-col"
        >
          <NotificationErrorBoundary
            fallback={
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Bell className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Notifications unavailable
                </p>
              </div>
            }
          >
            <ClientSideSuspense
              fallback={
                <div className="flex flex-col">
                  <SheetHeader className="border-b border-border/40 px-6 py-4">
                    <SheetTitle className="text-base">
                      Notifications
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 space-y-3 p-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg p-3"
                      >
                        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              }
            >
              <NotificationSidebar onClose={() => setOpen(false)} />
            </ClientSideSuspense>
          </NotificationErrorBoundary>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ── Unread count badge ──────────────────────────────────────────────────────

function UnreadBadge() {
  const { count } = useUnreadInboxNotificationsCount();

  if (!count || count === 0) return null;

  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ── Individual notification row with hover actions ──────────────────────────

function NotificationRow({
  notification,
}: {
  notification: InboxNotificationData;
}) {
  const [hovered, setHovered] = React.useState(false);
  const markAsRead = useMarkInboxNotificationAsRead();
  const deleteNotification = useDeleteInboxNotification();

  const handleClick = React.useCallback(() => {
    if (!notification.readAt) {
      markAsRead(notification.id);
    }
  }, [notification.id, notification.readAt, markAsRead]);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      <InboxNotification
        inboxNotification={notification}
        kinds={customNotificationKinds}
      />
      {/* Per-item delete button — visible on hover */}
      {hovered && (
        <button
          type="button"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-destructive transition-all z-10"
          onClick={(e) => {
            e.stopPropagation();
            deleteNotification(notification.id);
          }}
          title="Remove notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Sidebar content ─────────────────────────────────────────────────────────

function NotificationSidebar({ onClose }: { onClose: () => void }) {
  const { inboxNotifications, fetchMore, hasFetchedAll, isFetchingMore } =
    useInboxNotifications();
  const { count } = useUnreadInboxNotificationsCount();
  const markAllAsRead = useMarkAllInboxNotificationsAsRead();
  const deleteAll = useDeleteAllInboxNotifications();

  // Deduplicate by notification ID to prevent React key warnings
  const uniqueNotifications = React.useMemo(() => {
    const seen = new Set<string>();
    return inboxNotifications.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }, [inboxNotifications]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <SheetHeader className="flex-row items-center justify-between border-b border-border/40 px-6 py-4 space-y-0">
        <div className="flex items-center gap-2">
          <SheetTitle className="text-base">Notifications</SheetTitle>
          {count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
              {count}
            </span>
          )}
        </div>
        {uniqueNotifications.length > 0 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => markAllAsRead()}
              title="Mark all as read"
            >
              <CheckCheck />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => deleteAll()}
              title="Delete all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </SheetHeader>

      {/* Notification list */}
      {uniqueNotifications.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
          <Bell className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground/80">
            No notifications yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            You&apos;ll see updates about your projects here
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <InboxNotificationList>
            {uniqueNotifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
              />
            ))}
          </InboxNotificationList>

          {/* Load more */}
          {!hasFetchedAll && (
            <div className="px-4 py-3 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => fetchMore()}
                disabled={isFetchingMore}
              >
                {isFetchingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
                    Loading…
                  </span>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
