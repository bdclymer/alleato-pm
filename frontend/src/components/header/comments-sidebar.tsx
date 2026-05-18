"use client";

import * as React from "react";
import { LiveList, LiveObject } from "@liveblocks/client";
import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityComments } from "@/components/comments/entity-comments";
import {
  CollaborationEntityProvider,
} from "@/components/comments/entity-context";
import { getRoomId, type CommentableEntityType } from "@/lib/liveblocks/rooms";
import { useCommentsSidebarStore } from "@/lib/stores/comments-sidebar-store";
import { cn } from "@/lib/utils";
import { useEntityContext } from "./use-entity-context";
export { openCommentsSidebar } from "./comments-sidebar-button";

// ── Error boundary ──────────────────────────────────────────────────────────

class CommentsErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[CommentsSidebar] Collaboration sidebar error:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

const INITIAL_STORAGE = {
  meta: new LiveObject({ title: "" }),
  properties: new LiveObject({
    progress: "none" as const,
    priority: "none" as const,
    assignedTo: "none",
  }),
  labels: new LiveList<string>([]),
  links: new LiveList<string>([]),
};

// ── Push panel (lives in layout, pushes content) ─────────────────────────────

export function CommentsSidebarPanel() {
  const open = useCommentsSidebarStore((s) => s.open);
  const setOpen = useCommentsSidebarStore((s) => s.setOpen);
  const entityContext = useEntityContext();

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <div
      className={cn(
        "h-full shrink-0 border-l border-border bg-card flex flex-col overflow-hidden",
        "transition-[width] duration-300 ease-in-out",
        open ? "w-95" : "w-0 border-l-0",
      )}
    >
      {mounted && (
        <div className="flex h-full w-95 flex-col">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
            <span className="text-sm font-medium text-foreground">
              {entityContext ? `${entityContext.label} Comments` : "Comments"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              aria-label="Close comments"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          {!entityContext ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground/80">
                No comments available
              </p>
              <p className="text-xs text-muted-foreground">
                Navigate to a project tool to view comments
              </p>
            </div>
          ) : (
            <CommentsErrorBoundary
              fallback={
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Comments unavailable
                  </p>
                </div>
              }
            >
              <CollaborationEntityProvider
                value={{
                  entityType: entityContext.entityType,
                  entityId: entityContext.entityId,
                  projectId: entityContext.projectId,
                }}
              >
                <RoomProvider
                  id={getRoomId(entityContext.entityType, entityContext.entityId)}
                  initialPresence={{ cursor: null }}
                  initialStorage={INITIAL_STORAGE}
                >
                  <ClientSideSuspense fallback={<div className="flex min-h-0 w-full flex-1 p-4" />}>
                    <div className="flex min-h-0 w-full flex-1 p-4">
                      <EntityComments title="" stickyComposer />
                    </div>
                  </ClientSideSuspense>
                </RoomProvider>
              </CollaborationEntityProvider>
            </CommentsErrorBoundary>
          )}
        </div>
      )}
    </div>
  );
}
