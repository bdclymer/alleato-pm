"use client";

import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-ui/styles/dark/media-query.css";

import * as React from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, X } from "lucide-react";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useThreads,
} from "@liveblocks/react/suspense";
import type { ThreadData } from "@liveblocks/client";
import { Composer, Thread } from "@liveblocks/react-ui";

import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// This overlay mounts on EVERY page. A comments/connection failure must never
// take the app down with it — swallow errors and render nothing.
class SilentBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* intentionally silent — comments are non-critical */
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// One shared comment room per page URL, so everyone on the same page sees the
// same pins. Path segments become a stable, colon-delimited room id.
function pageRoomId(pathname: string): string {
  const clean = (pathname || "/")
    .replace(/[^a-zA-Z0-9/_-]/g, "-")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\//g, ":");
  return `alleato:page:${clean || "root"}`;
}

async function resolveUsers(userIds: readonly string[]) {
  if (userIds.length === 0) return [];
  const data = await apiFetch<{ users: ({ name: string } | null)[] }>(
    `/api/liveblocks/users?ids=${encodeURIComponent(userIds.join(","))}`,
  );
  return data.users.map((user) => user ?? undefined);
}

const Z = 2147483000; // above app chrome; Liveblocks portals sit on top of this

// A single pin marker anchored to its stored page coordinates; opens its thread.
function Pin({
  thread,
  open,
  onToggle,
}: {
  thread: ThreadData;
  open: boolean;
  onToggle: () => void;
}) {
  const x = thread.metadata.x;
  const y = thread.metadata.y;
  if (typeof x !== "number" || typeof y !== "number") return null;

  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: Z }}>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Open comment"
        className={cn(
          "flex h-7 w-7 -translate-x-1 -translate-y-7 items-center justify-center rounded-full rounded-bl-sm",
          "bg-primary text-primary-foreground shadow-sm ring-2 ring-background",
          "transition-transform hover:scale-110",
        )}
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div
          className="w-80 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
          style={{ position: "absolute", left: 8, top: 4 }}
          onClick={(event) => event.stopPropagation()}
        >
          <Thread thread={thread} />
        </div>
      ) : null}
    </div>
  );
}

function OverlayInner() {
  const { threads } = useThreads();
  const [placing, setPlacing] = React.useState(false);
  const [draft, setDraft] = React.useState<{ x: number; y: number } | null>(
    null,
  );
  const [openId, setOpenId] = React.useState<string | null>(null);

  const pins = threads.filter(
    (thread) =>
      typeof thread.metadata.x === "number" &&
      typeof thread.metadata.y === "number",
  );

  // While in comment mode, the next click anywhere drops a pin at that spot.
  const onPlaceClick = React.useCallback((event: React.MouseEvent) => {
    setDraft({
      x: event.clientX + window.scrollX,
      y: event.clientY + window.scrollY,
    });
    setPlacing(false);
  }, []);

  const overlay = (
    <>
      {/* Existing pins */}
      {pins.map((thread) => (
        <Pin
          key={thread.id}
          thread={thread}
          open={openId === thread.id}
          onToggle={() => setOpenId((id) => (id === thread.id ? null : thread.id))}
        />
      ))}

      {/* New-thread composer at the clicked location */}
      {draft ? (
        <div
          style={{ position: "absolute", left: draft.x, top: draft.y, zIndex: Z + 1 }}
        >
          <div
            className="w-80 -translate-y-2 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 pt-2 text-xs font-medium text-muted-foreground">
              <span>New comment</span>
              <button
                type="button"
                aria-label="Cancel"
                onClick={() => setDraft(null)}
                className="rounded p-0.5 hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <Composer
              autoFocus
              metadata={{ x: draft.x, y: draft.y }}
              onComposerSubmit={() => setDraft(null)}
            />
          </div>
        </div>
      ) : null}

      {/* Click-catcher while placing */}
      {placing ? (
        <div
          onClick={onPlaceClick}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: Z - 1,
            cursor: "crosshair",
            background: "hsl(var(--foreground) / 0.02)",
          }}
        />
      ) : null}

      {/* Floating toggle */}
      <button
        type="button"
        onClick={() => {
          setPlacing((value) => !value);
          setDraft(null);
        }}
        className={cn(
          "fixed bottom-5 right-5 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg",
          "transition-colors",
          placing
            ? "bg-foreground text-background"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
        style={{ zIndex: Z + 2 }}
      >
        <MessageSquarePlus className="h-4 w-4" />
        {placing ? "Click anywhere to comment" : "Comment"}
        {!placing && pins.length > 0 ? (
          <span className="rounded-full bg-primary-foreground/20 px-1.5 text-xs">
            {pins.length}
          </span>
        ) : null}
      </button>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}

// Global "click anywhere to comment" pin overlay, backed by Liveblocks and
// scoped to the current page URL. Gated behind NEXT_PUBLIC_PAGE_COMMENTS=on.
export function PageCommentsOverlay() {
  const pathname = usePathname();

  if (process.env.NEXT_PUBLIC_PAGE_COMMENTS !== "on") return null;

  return (
    <SilentBoundary>
      <LiveblocksProvider
        authEndpoint="/api/liveblocks/auth"
        resolveUsers={({ userIds }) => resolveUsers(userIds)}
      >
        <RoomProvider id={pageRoomId(pathname)}>
          <ClientSideSuspense fallback={null}>
            <OverlayInner />
          </ClientSideSuspense>
        </RoomProvider>
      </LiveblocksProvider>
    </SilentBoundary>
  );
}
