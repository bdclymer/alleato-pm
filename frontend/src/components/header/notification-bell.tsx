"use client";

import { Bell } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCollaborationNotifications } from "@/hooks/use-collaboration-notifications";
import { useDeferredMount } from "@/hooks/use-deferred-mount";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const active = pathname === "/notifications";
  const shouldLoadNotifications = useDeferredMount();
  const { unreadCount } = useCollaborationNotifications({
    enabled: shouldLoadNotifications,
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "relative h-8 w-8 p-0 transition-colors",
        active
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-label="Notifications"
      aria-pressed={active}
      onClick={() => router.push("/notifications")}
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
