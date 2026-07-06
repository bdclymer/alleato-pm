"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { PageShell } from "@/components/layout";
import { SectionRuleHeading } from "@/components/layout/spacing";
import {
  ActivityFeedList,
  initials,
  type ActivityFeedItem,
} from "@/components/notifications/activity-feed";
import { useVeltCommentUnreadCount } from "@/components/notifications/velt-comment-notifications";
import { EmptyState, Badge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useCollaborationNotifications,
} from "@/hooks/use-collaboration-notifications";
import { useCommentActivity } from "@/hooks/use-comment-activity";
import { getCollaborationNotificationHref } from "@/lib/collaboration/notification-links";
import { sortNotificationsByPriority } from "@/lib/collaboration/notification-priority";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  const [tab, setTab] = useState("all");
  const commentUnreadCount = useVeltCommentUnreadCount();
  const { items: commentActivity, isLoading: isCommentLoading } =
    useCommentActivity();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useCollaborationNotifications();

  const filtered = sortNotificationsByPriority(
    tab === "unread" ? notifications.filter((n) => !n.readAt) : notifications,
  );
  const projectItems = useMemo<ActivityFeedItem[]>(
    () =>
      filtered.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        href: getCollaborationNotificationHref(notification),
        createdAt: notification.createdAt,
        avatarLabel: initials(notification.title),
        isUnread: !notification.readAt,
        kind: "project",
        onClick: () => {
          if (!notification.readAt) {
            void markAsRead(notification.id);
          }
        },
        onDelete: () => void deleteNotification(notification.id),
      })),
    [deleteNotification, filtered, markAsRead],
  );
  const commentItems = useMemo<ActivityFeedItem[]>(
    () =>
          commentActivity.map((item) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            href: item.href,
            secondaryHref: item.followUpHref,
            secondaryLabel: item.followUpLabel,
            createdAt: item.createdAt,
            avatarLabel: initials(item.authorName),
            sourceLabel: item.documentLabel,
            kind: "comment",
          })),
    [commentActivity],
  );
  const totalUnreadCount = unreadCount + commentUnreadCount;

  const actions = (
    <div className="flex items-center gap-2">
      {totalUnreadCount > 0 && <Badge variant="secondary">{totalUnreadCount}</Badge>}
      {unreadCount > 0 && (
        <Button variant="ghost" size="sm" onClick={() => void markAllAsRead()}>
          Mark all read
        </Button>
      )}
    </div>
  );

  return (
    <PageShell variant="content" title="Notifications" actions={actions}>
      <div className="space-y-8">
        {isCommentLoading || commentItems.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <SectionRuleHeading label="Comment activity" className="mb-1 pb-0" />
                <p className="text-sm text-muted-foreground">
                  Mentions open the source page discussion, while replies can continue in team chat when you need a longer follow-up thread.
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/comments">All comments</Link>
              </Button>
            </div>
            <ActivityFeedList
              items={commentItems.slice(0, 12)}
              isLoading={isCommentLoading}
              emptyTitle="No comment activity"
              emptyDescription="Mentions and replies will show up here."
            />
          </section>
        ) : null}

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Project activity</TabsTrigger>
            <TabsTrigger value="unread">
              Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </TabsTrigger>
          </TabsList>
          <TabsContent value={tab}>
            <ActivityFeedList items={projectItems} isLoading={isLoading} />
          </TabsContent>
        </Tabs>

        {!isLoading && !isCommentLoading && projectItems.length === 0 && commentItems.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="No notifications"
            description="You'll be notified about comments, mentions, and project activity."
          />
        ) : null}
      </div>
    </PageShell>
  );
}
