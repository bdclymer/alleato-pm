"use client";

import { Bell, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCollaborationNotifications,
  type CollaborationNotification,
} from "@/hooks/use-collaboration-notifications";
import { useDeferredMount } from "@/hooks/use-deferred-mount";
import { cn } from "@/lib/utils";

function formatTime(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 7 ? `${days}d ago` : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(title?: string | null) {
  if (!title) return "?";
  return title.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function NotificationItem({
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
    <div className="group/item relative">
      {isUnread && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-primary" />
      )}
      <Link
        href={href}
        onClick={() => isUnread && onMarkRead(notification.id)}
        className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
          {initials(notification.title)}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs leading-snug", isUnread ? "font-medium text-foreground" : "text-muted-foreground")}>
            {notification.title}
          </p>
          {notification.body && (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
              {notification.body}
            </p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground/50">
            {formatTime(notification.createdAt)}
          </p>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(notification.id)}
        aria-label="Delete"
        className="absolute right-2 top-2.5 h-6 w-6 opacity-0 transition-opacity group-hover/item:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const shouldLoad = useDeferredMount();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } =
    useCollaborationNotifications({ enabled: shouldLoad });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative h-8 w-8 p-0 transition-colors",
            open
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 shadow-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-0 py-0 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => void markAllAsRead()}
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto border-t border-border/50">
          {isLoading ? (
            <div className="space-y-0.5 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 px-4 py-3">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Bell className="h-5 w-5 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.slice(0, 8).map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={(id) => void markAsRead(id)}
                  onDelete={(id) => void deleteNotification(id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-4 py-2.5">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            See all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
