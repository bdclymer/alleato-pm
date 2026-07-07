"use client";

import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-ui/styles/dark/media-query.css";

import * as React from "react";
import { AlertCircle, MessageSquarePlus } from "lucide-react";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useThreads,
} from "@liveblocks/react/suspense";
import { Composer, Thread } from "@liveblocks/react-ui";

import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { getRoomId } from "@/lib/collaboration/rooms";
import { useCollaborationEntityContext } from "./entity-context";

interface LiveblocksEntityCommentsProps {
  title?: string;
  className?: string;
  /** Keep the composer visible at the bottom while scrolling thread history. */
  stickyComposer?: boolean;
}

async function resolveUsers(userIds: readonly string[]) {
  if (userIds.length === 0) return [];
  const data = await apiFetch<{ users: ({ name: string } | null)[] }>(
    `/api/liveblocks/users?ids=${encodeURIComponent(userIds.join(","))}`,
  );
  return data.users.map((user) => user ?? undefined);
}

function ThreadList() {
  const { threads } = useThreads();

  if (threads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No comments yet. Start the conversation below.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {threads.map((thread) => (
        <Thread
          key={thread.id}
          thread={thread}
          className="alleato-lb-thread"
        />
      ))}
    </div>
  );
}

// Liveblocks-backed replacement for the Velt EntityComments section. Renders the
// thread list + composer for the current entity's room. Gated behind
// NEXT_PUBLIC_COMMENTS_ENGINE=liveblocks by the EntityComments wrapper.
export function LiveblocksEntityComments({
  title = "Comments",
  className,
  stickyComposer = false,
}: LiveblocksEntityCommentsProps) {
  const entity = useCollaborationEntityContext();

  if (!entity) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <AlertCircle className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Comments unavailable for this page.
        </p>
      </div>
    );
  }

  const roomId = getRoomId(entity.entityType, entity.entityId);

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks/auth" resolveUsers={({ userIds }) => resolveUsers(userIds)}>
      <RoomProvider id={roomId}>
        <section
          className={cn(
            "alleato-lb-comments w-full",
            stickyComposer && "flex h-full min-h-0 flex-col",
            className,
          )}
        >
          {title.trim().length > 0 ? (
            <div className="mb-6 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <MessageSquarePlus className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">{title}</span>
            </div>
          ) : null}

          <ClientSideSuspense
            fallback={
              <p className="text-sm text-muted-foreground">Loading comments…</p>
            }
          >
            <div
              className={cn(
                "flex flex-col gap-4",
                stickyComposer && "min-h-0 flex-1",
              )}
            >
              <ThreadList />
              <Composer className="alleato-lb-composer" />
            </div>
          </ClientSideSuspense>
        </section>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
