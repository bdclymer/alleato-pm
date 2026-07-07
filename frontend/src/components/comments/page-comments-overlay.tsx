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

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { usePageCommentsStore } from "@/lib/stores/page-comments-store";

// This overlay mounts on top of the app. A comments/connection failure must
// never take the app down with it — swallow errors and render nothing.
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
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        aria-label="Open comment"
        className={cn(
          "flex h-7 w-7 -translate-x-1 -translate-y-7 items-center justify-center rounded-full rounded-bl-sm p-0",
          "bg-primary text-primary-foreground shadow-sm ring-2 ring-background hover:bg-primary/90",
          "transition-transform hover:scale-110",
        )}
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
      </Button>
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

// Rendered only while comment mode is active. The whole page becomes clickable
// to drop a pin; existing pins are shown; Esc or the banner's × exits.
function OverlayInner() {
  const setActive = usePageCommentsStore((state) => state.setActive);
  const { threads } = useThreads();
  const [draft, setDraft] = React.useState<{ x: number; y: number } | null>(
    null,
  );
  const [openId, setOpenId] = React.useState<string | null>(null);

  const pins = threads.filter(
    (thread) =>
      typeof thread.metadata.x === "number" &&
      typeof thread.metadata.y === "number",
  );

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDraft(null);
        setActive(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setActive]);

  const onPlaceClick = (event: React.MouseEvent) => {
    setDraft({
      x: event.clientX + window.scrollX,
      y: event.clientY + window.scrollY,
    });
  };

  const overlay = (
    <>
      {/* Mode hint + exit */}
      <div
        className="fixed left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-lg"
        style={{ zIndex: Z + 2 }}
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        Click anywhere to comment
        <span className="opacity-60">· Esc to exit</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Exit comment mode"
          onClick={() => {
            setDraft(null);
            setActive(false);
          }}
          className="ml-1 h-5 w-5 rounded-full text-background hover:bg-background/20 hover:text-background"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Existing pins */}
      {pins.map((thread) => (
        <Pin
          key={thread.id}
          thread={thread}
          open={openId === thread.id}
          onToggle={() =>
            setOpenId((id) => (id === thread.id ? null : thread.id))
          }
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
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Cancel"
                onClick={() => setDraft(null)}
                className="h-5 w-5"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Composer
              autoFocus
              metadata={{ x: draft.x, y: draft.y }}
              onComposerSubmit={() => setDraft(null)}
            />
          </div>
        </div>
      ) : null}

      {/* Click-catcher (only when not already placing a draft) */}
      {!draft ? (
        <div
          onClick={onPlaceClick}
          className="bg-foreground/5"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: Z - 1,
            cursor: "crosshair",
          }}
        />
      ) : null}
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}

// Global click-anywhere pin overlay, backed by Liveblocks, scoped to the current
// page URL. Toggled from the header comment icon (usePageCommentsStore). Mounts
// the Liveblocks connection ONLY while active, so nothing — badge included —
// sits on the page when comment mode is off. Gated by NEXT_PUBLIC_PAGE_COMMENTS.
export function PageCommentsOverlay() {
  const pathname = usePathname();
  const active = usePageCommentsStore((state) => state.active);

  if (process.env.NEXT_PUBLIC_PAGE_COMMENTS !== "on") return null;
  if (!active) return null;

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
