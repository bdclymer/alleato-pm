"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ActivityFeedList,
  initials,
  type ActivityFeedItem,
} from "@/components/notifications/activity-feed";
import { useVeltCommentUnreadCount } from "@/components/notifications/velt-comment-notifications";
import { Button } from "@/components/ui/button";
import {
  SidePanel,
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@/components/ui/side-panel";
import {
  useCollaborationNotifications,
} from "@/hooks/use-collaboration-notifications";
import { useCommentActivity } from "@/hooks/use-comment-activity";
import { getCollaborationNotificationHref } from "@/lib/collaboration/notification-links";
import { sortNotificationsByPriority } from "@/lib/collaboration/notification-priority";
import { shouldForceCollaborationRuntime } from "@/lib/performance/runtime-gates";
import { useCollaborationRuntimeStore } from "@/lib/stores/collaboration-runtime-store";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const collaborationRuntimeEnabled = useCollaborationRuntimeStore(
    (state) => state.enabled,
  );
  const collaborationRuntimeActive =
    collaborationRuntimeEnabled || shouldForceCollaborationRuntime(pathname);
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } =
    useCollaborationNotifications({ enabled: open });
  const { items: commentActivity, isLoading: isCommentLoading } =
    useCommentActivity({ enabled: open && collaborationRuntimeActive });
  const commentUnreadCount = useVeltCommentUnreadCount();
  const totalUnreadCount = unreadCount + commentUnreadCount;
  const prioritizedNotifications = sortNotificationsByPriority(notifications);
  const feedItems = useMemo<ActivityFeedItem[]>(() => {
    const projectItems = prioritizedNotifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      href: getCollaborationNotificationHref(notification),
      createdAt: notification.createdAt,
      avatarLabel: initials(notification.title),
      isUnread: !notification.readAt,
      kind: "project" as const,
      onClick: () => {
        setOpen(false);
        if (!notification.readAt) {
          void markAsRead(notification.id);
        }
      },
      onDelete: () => void deleteNotification(notification.id),
    }));

    const commentItems = commentActivity.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      href: item.href,
      createdAt: item.createdAt,
      avatarLabel: initials(item.authorName),
      sourceLabel: item.documentLabel,
      kind: "comment" as const,
      onClick: () => setOpen(false),
    }));

    return [...commentItems, ...projectItems]
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      )
      .slice(0, 8);
  }, [
    commentActivity,
    deleteNotification,
    markAsRead,
    prioritizedNotifications,
  ]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "relative h-8 w-8 p-0 transition-colors",
          open
            ? "bg-primary/10 text-primary hover:bg-primary/20"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {totalUnreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
          </span>
        ) : null}
      </Button>

      <SidePanel open={open} onOpenChange={setOpen}>
        <SidePanelContent side="right" size="compact">
          <SidePanelHeader className="border-b border-border/60">
            <div className="flex items-center justify-between gap-3">
              <SidePanelTitle>Notifications</SidePanelTitle>
              {unreadCount > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 py-0 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => void markAllAsRead()}
                >
                  Mark all read
                </Button>
              ) : null}
            </div>
          </SidePanelHeader>

          <SidePanelBody className="px-0 py-0">
            <ActivityFeedList
              items={feedItems}
              isLoading={isLoading || isCommentLoading}
              emptyTitle="No activity yet"
              emptyDescription="You'll be notified about comments, mentions, and project activity."
            />
          </SidePanelBody>

          <SidePanelFooter className="border-t border-border/60">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              See all notifications
            </Link>
          </SidePanelFooter>
        </SidePanelContent>
      </SidePanel>
    </>
  );
}
