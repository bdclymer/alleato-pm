"use client";

import { MessageSquare } from "lucide-react";
import {
  VeltNotificationsPanel,
  useUnreadNotificationsCount,
} from "@veltdev/react";
import { SectionRuleHeading } from "@/components/layout";

const COMMENT_NOTIFICATION_TABS = {
  forYou: { enable: true, name: "For you" },
  all: { enable: false },
  people: { enable: false },
  documents: { enable: false },
};

export function useVeltCommentUnreadCount(): number {
  const unread = useUnreadNotificationsCount();
  return unread.forYou ?? 0;
}

export function VeltCommentNotifications({
  compact = false,
}: {
  compact?: boolean;
}) {
  if (!process.env.NEXT_PUBLIC_VELT_API_KEY) {
    return null;
  }

  return (
    <section className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex items-center gap-2 px-4">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <div>
          <SectionRuleHeading label="Comment mentions" className="mb-0 pb-0" />
          <p className="text-xs text-muted-foreground">
            Mentions and replies from page comments.
          </p>
        </div>
      </div>
      <div className={compact ? "px-2 pb-2" : ""}>
        <VeltNotificationsPanel
          shadowDom={false}
          settings={false}
          pageSize={compact ? 6 : 20}
          tabConfig={COMMENT_NOTIFICATION_TABS}
        />
      </div>
    </section>
  );
}
