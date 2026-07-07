"use client";

import * as React from "react";
import {
  useMarkAllInboxNotificationsAsRead,
  useUnreadInboxNotificationsCount,
} from "@liveblocks/react";

import { AppInboxList } from "@/components/collaboration/app-inbox-list";
import { EmptyState, Badge } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell } from "lucide-react";

export const dynamic = "force-dynamic";

// Liveblocks hooks throw if the provider is unavailable. Keep the page shell up
// and degrade to a quiet empty state instead of crashing.
class InboxBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* intentionally silent — notifications are non-critical */
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function UnreadCountBadge() {
  const { count } = useUnreadInboxNotificationsCount();
  if (!count) return null;
  return <Badge variant="secondary">{count}</Badge>;
}

function MarkAllReadAction() {
  const markAllAsRead = useMarkAllInboxNotificationsAsRead();
  const { count } = useUnreadInboxNotificationsCount();
  if (!count) return null;
  return (
    <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>
      Mark all read
    </Button>
  );
}

function UnreadTabLabel() {
  const { count } = useUnreadInboxNotificationsCount();
  return <>Unread{count ? ` (${count})` : ""}</>;
}

export default function NotificationsPage() {
  const [tab, setTab] = React.useState("all");

  const actions = (
    <InboxBoundary fallback={null}>
      <div className="flex items-center gap-2">
        <UnreadCountBadge />
        <MarkAllReadAction />
      </div>
    </InboxBoundary>
  );

  return (
    <PageShell variant="content" title="Notifications" actions={actions}>
      <InboxBoundary
        fallback={
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="Notifications unavailable"
            description="The notification service is temporarily unreachable."
          />
        }
      >
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              <UnreadTabLabel />
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <AppInboxList />
          </TabsContent>
          <TabsContent value="unread">
            <AppInboxList unreadOnly />
          </TabsContent>
        </Tabs>
      </InboxBoundary>
    </PageShell>
  );
}
