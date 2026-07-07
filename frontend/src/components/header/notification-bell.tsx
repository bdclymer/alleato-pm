"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  useMarkAllInboxNotificationsAsRead,
  useUnreadInboxNotificationsCount,
} from "@liveblocks/react";

import { AppInboxList } from "@/components/collaboration/app-inbox-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ds";
import {
  SidePanel,
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@/components/ui/side-panel";
import { cn } from "@/lib/utils";

// Liveblocks hooks throw if the provider is unavailable (e.g. the app-level
// CollaborationProvider fell back after a connection failure). This boundary
// keeps the header bell rendering — it just shows no inbox data — instead of
// taking the whole header down.
class BellBoundary extends React.Component<
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

function InboxUnreadBadge() {
  const { count } = useUnreadInboxNotificationsCount();
  if (!count) return null;
  return (
    <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function MarkAllReadButton() {
  const markAllAsRead = useMarkAllInboxNotificationsAsRead();
  const { count } = useUnreadInboxNotificationsCount();
  if (!count) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto px-0 py-0 text-[11px] text-muted-foreground hover:text-foreground"
      onClick={() => markAllAsRead()}
    >
      Mark all read
    </Button>
  );
}

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);

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
        <BellBoundary fallback={null}>
          <InboxUnreadBadge />
        </BellBoundary>
      </Button>

      <SidePanel open={open} onOpenChange={setOpen}>
        <SidePanelContent side="right" size="compact">
          <SidePanelHeader className="border-b border-border/60">
            <div className="flex items-center justify-between gap-3">
              <SidePanelTitle>Notifications</SidePanelTitle>
              <BellBoundary fallback={null}>
                <MarkAllReadButton />
              </BellBoundary>
            </div>
          </SidePanelHeader>

          <SidePanelBody className="px-0 py-0">
            <BellBoundary
              fallback={
                <div className="px-4 py-6">
                  <EmptyState
                    icon={<Bell className="h-6 w-6" />}
                    title="Notifications unavailable"
                    description="The notification service is temporarily unreachable."
                  />
                </div>
              }
            >
              <AppInboxList onNavigate={() => setOpen(false)} />
            </BellBoundary>
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
