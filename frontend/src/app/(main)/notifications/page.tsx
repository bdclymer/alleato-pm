"use client";

import * as React from "react";
import {
  useMarkAllInboxNotificationsAsRead,
  useUnreadInboxNotificationsCount,
} from "@liveblocks/react";
import { Bell, MoreVertical } from "lucide-react";

import { AppInboxList } from "@/components/collaboration/app-inbox-list";
import { EmptyState } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

// Liveblocks hooks throw if the provider is unavailable. Keep the page shell up
// and degrade to a quiet empty state instead of crashing — and report the
// failure so a missing inbox is diagnosable rather than an invisible no-op.
class InboxBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[notifications] inbox unavailable:", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// The unread count is shown once — on the Unread tab. No separate count pill.
function UnreadTabLabel() {
  const { count } = useUnreadInboxNotificationsCount();
  return <>Unread{count ? ` (${count})` : ""}</>;
}

// "Mark all read" lives in the overflow menu, not as floating header text.
function NotificationsMenu() {
  const markAllAsRead = useMarkAllInboxNotificationsAsRead();
  const { count } = useUnreadInboxNotificationsCount();
  if (!count) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Notification actions"
          className="h-9 w-9 text-muted-foreground"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => markAllAsRead()}>
          Mark all read
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function NotificationsPage() {
  const [tab, setTab] = React.useState("all");

  const actions = (
    <InboxBoundary fallback={null}>
      <NotificationsMenu />
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
