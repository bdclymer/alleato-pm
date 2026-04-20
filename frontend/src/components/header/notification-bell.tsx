"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  type CollaborationNotification,
  useCollaborationNotifications,
} from "@/hooks/use-collaboration-notifications";

function formatRelativeDate(timestamp: string) {
  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) return "Now";

  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function NotificationRow({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: CollaborationNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isUnread = !notification.readAt;
  const href =
    notification.projectId && notification.entityType
      ? `/${notification.projectId}/${notification.entityType}/${notification.entityId ?? ""}`
      : "/team-chat";

  return (
    <div className="group relative border-b border-border/45 px-4 py-3 last:border-b-0">
      {isUnread ? (
        <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-primary" />
      ) : null}

      <div className={isUnread ? "bg-muted/20" : undefined}>
        <Link href={href} className="block" onClick={() => isUnread && onMarkRead(notification.id)}>
          <div className="pr-8">
            <p className="text-sm font-medium text-foreground">{notification.title}</p>
            {notification.body ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
            ) : null}
            <p className="mt-1 text-[11px] text-muted-foreground/90">
              {formatRelativeDate(notification.createdAt)}
            </p>
          </div>
        </Link>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 p-0 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
          onClick={() => onDelete(notification.id)}
          title="Remove notification"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    isFetchingMore,
    hasMore,
    fetchMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
  } = useCollaborationNotifications();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={12}
        className="site-header-notification-popover relative w-96 rounded-2xl border border-border/70 bg-popover p-0 shadow-sm"
      >
        <span className="absolute -top-2 right-4 h-4 w-4 rotate-45 border-l border-t border-border/70 bg-popover" />

        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-border/50 px-4 py-3.5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                {unreadCount}
              </span>
            ) : null}
          </div>
          {/* eslint-disable-next-line design-system/no-raw-heading */}
          <h3 className="text-base font-semibold">Notifications</h3>
          <div className="ml-auto flex items-center gap-1">
            {notifications.length > 0 ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => void markAllAsRead()}
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => void deleteAll()}
                  title="Delete all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg p-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Bell className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground/80">No notifications yet</p>
            <p className="mt-1 text-xs text-muted-foreground">You&apos;ll see project updates here.</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onMarkRead={(id) => void markAsRead(id)}
                onDelete={(id) => void deleteNotification(id)}
              />
            ))}

            {hasMore ? (
              <div className="border-t border-border/50 px-4 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => void fetchMore()}
                  disabled={isFetchingMore}
                >
                  {isFetchingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            ) : null}
          </div>
        )}

        <div className="border-t border-border/50 px-4 py-3">
          <Button asChild variant="ghost" size="sm" className="w-full text-sm font-medium text-primary hover:text-primary">
            <Link href="/team-chat" onClick={() => setOpen(false)}>
              See all incoming activity
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
