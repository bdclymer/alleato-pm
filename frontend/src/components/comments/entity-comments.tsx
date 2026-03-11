"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import {
  ClientSideSuspense,
  useThreads,
  useRoom,
} from "@liveblocks/react/suspense";
import { useOthers, useSelf } from "@liveblocks/react";
import { Composer, Thread, Comment } from "@liveblocks/react-ui";
import type { ThreadData } from "@liveblocks/client";
import { Check, MessageSquare } from "lucide-react";
import { getIssueIdFromRoom } from "./utils";

// ── Public component ─────────────────────────────────────────────────────────

interface EntityCommentsProps {
  /** Optional title shown above the comment section */
  title?: string;
  /** Optional className for the wrapper */
  className?: string;
}

/**
 * Drop-in comments section for any entity page.
 *
 * Must be rendered inside an `<EntityRoom>` so that `useThreads()` has a
 * room context. Renders all threads plus a composer for new threads.
 *
 * Usage:
 * ```tsx
 * <EntityRoom entityType="rfi" entityId={rfi.id}>
 *   <EntityComments title="Discussion" />
 * </EntityRoom>
 * ```
 */
export function EntityComments({
  title = "Comments",
  className,
}: EntityCommentsProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <ClientSideSuspense
        fallback={
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        }
      >
        <ThreadList />
        <div className="mt-4">
          <Composer className="lb-composer-alleato" />
        </div>
      </ClientSideSuspense>
    </div>
  );
}

// ── Thread list ──────────────────────────────────────────────────────────────

function ThreadList() {
  const { threads } = useThreads();

  if (threads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No comments yet. Start the conversation below.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {threads.map((thread) => (
        <CustomThread key={thread.id} thread={thread} />
      ))}
    </div>
  );
}

// ── Individual thread with resolve/collapse ──────────────────────────────────

function CustomThread({ thread }: { thread: ThreadData }) {
  const room = useRoom();
  const [open, setOpen] = useState(!thread.resolved);

  // Build a permalink for copying
  const parsed = getIssueIdFromRoom(room.id);
  const commentLink =
    typeof window !== "undefined" && parsed
      ? `${window.location.origin}/${parsed.entityType}/${parsed.entityId}#${thread.id}`
      : "";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <Check className="h-3.5 w-3.5 text-green-600" />
        <span>Thread resolved</span>
        <span className="ml-auto text-muted-foreground/60">Click to expand</span>
      </button>
    );
  }

  return (
    <Thread
      thread={thread}
      className="lb-thread-alleato"
      onResolvedChange={(resolved) => {
        if (resolved) setOpen(false);
      }}
      components={{ Comment: CommentWithPresence }}
      indentCommentContent={false}
    />
  );
}

// ── Comment with presence-aware avatar ───────────────────────────────────────

function CommentWithPresence(
  props: ComponentPropsWithoutRef<typeof Comment>,
) {
  const userId = props.comment.userId;
  const isPresent = useUserIdPresence(userId);

  return (
    <Comment
      {...props}
      avatar={
        <div className="relative">
          <Comment.Avatar userId={userId} />
          {isPresent && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
          )}
        </div>
      }
    />
  );
}

// ── Presence helper ──────────────────────────────────────────────────────────

function useUserIdPresence(userId: string): boolean {
  const self = useSelf();
  const others = useOthers();

  if (self?.id === userId) return true;
  return others.some((o) => o.id === userId);
}

// ── Re-export for convenience ────────────────────────────────────────────────

export { EntityRoom } from "./entity-room";
