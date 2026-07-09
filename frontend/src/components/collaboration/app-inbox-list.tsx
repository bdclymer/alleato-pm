"use client";

import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-ui/styles/dark/media-query.css";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useInboxNotifications } from "@liveblocks/react";
import {
  InboxNotification,
  InboxNotificationList,
  type InboxNotificationCustomKindProps,
} from "@liveblocks/react-ui";

import { EmptyState } from "@/components/ds";

// Renders app-domain notifications mirrored from `collaboration_notifications`
// into the Liveblocks inbox under the flat `$alleato` kind. Native comment /
// mention / thread notifications render with Liveblocks' built-in kinds.
function AlleatoInboxNotification(
  props: InboxNotificationCustomKindProps<"$alleato">,
) {
  const { title, body, href } = props.inboxNotification.activities[0].data;

  return (
    <InboxNotification.Custom
      {...props}
      title={title}
      href={href}
      aside={
        <InboxNotification.Icon>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </InboxNotification.Icon>
      }
    >
      {body ?? null}
    </InboxNotification.Custom>
  );
}

function InboxSkeleton() {
  return (
    <div className="space-y-4 px-4 py-5">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-start gap-3">
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The unified notification inbox used by both the header bell and the
 * /notifications page. Reads from Liveblocks (`useInboxNotifications`) and
 * renders native comment/mention notifications plus app-domain `$alleato` ones.
 *
 * @param onNavigate  Called before navigating away (e.g. to close the panel).
 * @param unreadOnly  Show only unread notifications.
 */
export function AppInboxList({
  onNavigate,
  unreadOnly = false,
}: {
  onNavigate?: () => void;
  unreadOnly?: boolean;
}) {
  const router = useRouter();
  const { inboxNotifications, isLoading, error } = useInboxNotifications();

  if (isLoading) {
    return <InboxSkeleton />;
  }

  // useInboxNotifications (non-suspense) types this as possibly-undefined even
  // after the isLoading guard, so default to an empty list.
  const all = inboxNotifications ?? [];
  const items = unreadOnly
    ? all.filter((notification) => notification.readAt === null)
    : all;

  if (error || items.length === 0) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title={
            error
              ? "Couldn't load notifications"
              : unreadOnly
                ? "You're all caught up"
                : "No activity yet"
          }
          description={
            error
              ? "Notifications will reappear once the connection recovers."
              : "You'll be notified about comments, mentions, and project activity."
          }
        />
      </div>
    );
  }

  return (
    <InboxNotificationList>
      {items.map((notification) => (
        <InboxNotification
          key={notification.id}
          inboxNotification={notification}
          onClick={(event) => {
            const href =
              notification.kind === "$alleato"
                ? notification.activities[0]?.data.href
                : undefined;
            if (href) {
              event.preventDefault();
              onNavigate?.();
              router.push(href);
            }
          }}
          kinds={{ $alleato: AlleatoInboxNotification }}
        />
      ))}
    </InboxNotificationList>
  );
}
