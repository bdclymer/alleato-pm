"use client";

import { useState, useMemo, type ComponentPropsWithoutRef } from "react";
import {
  ClientSideSuspense,
  useThreads,
  useRoom,
} from "@liveblocks/react/suspense";
import { useOthers, useSelf } from "@liveblocks/react";
import { Composer, Thread, Comment } from "@liveblocks/react-ui";
import type { ThreadData } from "@liveblocks/client";
import { Check, MessageSquarePlus } from "lucide-react";
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
  const hasTitle = Boolean(title?.trim());

  return (
    <div className={`alleato-comments ${className ?? ""}`}>
      {hasTitle ? (
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <MessageSquarePlus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">Discussion thread</p>
          </div>
        </div>
      ) : null}
      <ClientSideSuspense
        fallback={
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-20 animate-pulse rounded-md bg-muted" />
                    <div className="h-2.5 w-16 animate-pulse rounded-md bg-muted/60" />
                  </div>
                  <div className="h-3 w-4/5 animate-pulse rounded-md bg-muted/80" />
                  <div className="h-3 w-3/5 animate-pulse rounded-md bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        }
      >
        <ThreadList />
        <div className="mt-6">
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
      <div className="flex flex-col items-center py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-3">
          <MessageSquarePlus className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          No comments yet
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Start the conversation below
        </p>
      </div>
    );
  }

  return (
    <div className="alleato-thread-list relative">
      {/* Timeline vertical line */}
      <div className="absolute left-5 top-5 bottom-0 w-px bg-border/60" />
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
  const [showReply, setShowReply] = useState(false);

  // Build a permalink for copying
  const parsed = getIssueIdFromRoom(room.id);
  const commentLink = useMemo(() => {
    if (typeof window === "undefined" || !parsed) return "";
    const { entityType, entityId } = parsed;
    const projectMatch = entityId.match(/^project-(\d+)$/);
    const path = projectMatch
      ? `/${projectMatch[1]}/${entityType}`
      : `/${entityType}/${entityId}`;
    return `${window.location.origin}${path}#${thread.id}`;
  }, [parsed, thread.id]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="relative z-10 flex w-full items-center gap-3 rounded-lg py-3 pl-12 pr-3 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
      >
        <div className="absolute left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
        </div>
        <span className="font-medium">Thread resolved</span>
        <span className="ml-auto text-muted-foreground/50 text-[11px]">
          Click to expand
        </span>
      </button>
    );
  }

  return (
    <div>
      <Thread
        thread={thread}
        className="lb-thread-alleato"
        showComposer={false}
        onResolvedChange={(resolved) => {
          if (resolved) setOpen(false);
        }}
        components={{ Comment: CommentWithPresence }}
        indentCommentContent={false}
      />
      {showReply ? (
        <div className="mt-2 pl-10">
          <Composer
            threadId={thread.id}
            className="lb-composer-alleato"
            onComposerSubmit={() => setShowReply(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowReply(true)}
          className="mt-1 pl-10 text-xs text-muted-foreground/60 hover:text-primary transition-colors"
        >
          Reply
        </button>
      )}
    </div>
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
            <span className="absolute -bottom-px -right-px h-2 w-2 rounded-full border-[1.5px] border-background bg-green-500" />
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
