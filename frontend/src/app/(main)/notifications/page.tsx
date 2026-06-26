"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Trash2 } from "lucide-react";
import { PageShell } from "@/components/layout";
import { EmptyState, Badge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useCollaborationNotifications,
  type CollaborationNotification,
} from "@/hooks/use-collaboration-notifications";
import { getCollaborationNotificationHref } from "@/lib/collaboration/notification-links";

export const dynamic = "force-dynamic";

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
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(title?: string | null) {
  if (!title) return "?";
  return title
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
  const href = getCollaborationNotificationHref(notification);

  return (
    <div className="group/row relative">
      {isUnread && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-primary" />
      )}
      <Link
        href={href}
        onClick={() => isUnread && onMarkRead(notification.id)}
        className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {initials(notification.title)}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={
              isUnread
                ? "text-sm font-medium text-foreground"
                : "text-sm text-muted-foreground"
            }
          >
            {notification.title}
          </p>
          {notification.body && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {notification.body}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground/60">
            {formatTime(notification.createdAt)}
          </p>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(notification.id)}
        aria-label="Delete notification"
        className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover/row:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function NotificationList({
  items,
  onMarkRead,
  onDelete,
}: {
  items: CollaborationNotification[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <EmptyState
        icon={<Bell className="h-6 w-6" />}
        title="No notifications"
        description="You'll be notified about comments, mentions, and project activity."
      />
    );
  }
  return (
    <div className="divide-y divide-border/50">
      {items.map((n) => (
        <NotificationRow
          key={n.id}
          notification={n}
          onMarkRead={onMarkRead}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const [tab, setTab] = useState("all");
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useCollaborationNotifications();

  const filtered =
    tab === "unread"
      ? notifications.filter((n) => !n.readAt)
      : notifications;

  const actions = (
    <div className="flex items-center gap-2">
      {unreadCount > 0 && <Badge variant="secondary">{unreadCount}</Badge>}
      {unreadCount > 0 && (
        <Button variant="ghost" size="sm" onClick={() => void markAllAsRead()}>
          Mark all read
        </Button>
      )}
    </div>
  );

  return (
    <PageShell variant="content" title="Notifications" actions={actions}>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {isLoading ? (
            <div className="space-y-1">
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          ) : (
            <NotificationList
              items={filtered}
              onMarkRead={(id) => void markAsRead(id)}
              onDelete={(id) => void deleteNotification(id)}
            />
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
