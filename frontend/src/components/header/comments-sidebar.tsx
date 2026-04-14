"use client";

import * as React from "react";
import { MessageSquare, X } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { RoomProvider } from "@liveblocks/react/suspense";
import { LiveList, LiveObject } from "@liveblocks/client";
import { EntityComments } from "@/components/comments/entity-comments";
import { getRoomId, type CommentableEntityType } from "@/lib/liveblocks/rooms";
import { useCommentsSidebarStore } from "@/lib/stores/comments-sidebar-store";
import { cn } from "@/lib/utils";

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
    console.warn("[CommentsSidebar] Liveblocks error:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

// ── Derive entity context from URL ──────────────────────────────────────────

interface EntityContext {
  entityType: CommentableEntityType;
  entityId: string;
  label: string;
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

/**
 * Map the current URL path to a Liveblocks entity context.
 * Detail pages (e.g. /43/rfis/123) → entity-level room.
 * List pages (e.g. /43/budget) → project-tool-level room.
 */
export function useEntityContext(): EntityContext | null {
  const params = useParams();
  const pathname = usePathname();

  return React.useMemo(() => {
    // ── Non-project routes (e.g. /issues/[issueId]) ──────────────────────────
    const issueId = params.issueId as string | undefined;
    if (issueId && pathname.startsWith("/issues/")) {
      return {
        entityType: "issue" as const,
        entityId: issueId,
        label: `Issue #${issueId}`,
      };
    }

    // ── Project-scoped routes ────────────────────────────────────────────────
    const projectId = params.projectId as string | undefined;
    if (!projectId) return null;

    const segments = pathname.split("/").filter(Boolean);
    const projectIndex = segments.indexOf(projectId);
    if (projectIndex === -1) return null;

    const toolSegment = segments[projectIndex + 1];
    if (!toolSegment) return null;

    const detailId = segments[projectIndex + 2];
    const isDetailPage =
      detailId &&
      detailId !== "new" &&
      detailId !== "settings" &&
      detailId !== "configure" &&
      detailId !== "setup" &&
      detailId !== "all" &&
      detailId !== "recycle-bin";

    const toolMap: Record<string, { entityType: CommentableEntityType; label: string }> = {
      budget: { entityType: "budget", label: "Budget" },
      schedule: { entityType: "schedule", label: "Schedule" },
      rfis: { entityType: "rfi", label: "RFI" },
      submittals: { entityType: "submittal", label: "Submittal" },
      "change-events": { entityType: "change-order", label: "Change Event" },
      "change-orders": { entityType: "change-order", label: "Change Order" },
      commitments: { entityType: "commitment", label: "Commitment" },
      "direct-costs": { entityType: "direct-cost", label: "Direct Cost" },
      "punch-list": { entityType: "punch-item", label: "Punch List" },
      "daily-log": { entityType: "daily-log", label: "Daily Log" },
      meetings: { entityType: "meeting", label: "Meeting" },
      drawings: { entityType: "drawing", label: "Drawings" },
      specifications: { entityType: "specification", label: "Specifications" },
    };

    const mapping = toolMap[toolSegment];
    if (!mapping) return null;

    if (isDetailPage) {
      return {
        entityType: mapping.entityType,
        entityId: detailId,
        label: `${mapping.label} #${detailId}`,
      };
    }

    return {
      entityType: mapping.entityType,
      entityId: `project-${projectId}`,
      label: mapping.label,
    };
  }, [params, pathname]);
}

// ── Programmatic open helper ─────────────────────────────────────────────────

/** Open the comments sidebar from anywhere in the app */
export function openCommentsSidebar() {
  window.dispatchEvent(new CustomEvent("open-comments-sidebar"));
}

// ── Header button ────────────────────────────────────────────────────────────

export function CommentsSidebar() {
  const toggle = useCommentsSidebarStore((s) => s.toggle);
  const open = useCommentsSidebarStore((s) => s.open);
  const setOpen = useCommentsSidebarStore((s) => s.setOpen);

  // Listen for external open requests (e.g. from budget header chat button)
  React.useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-comments-sidebar", handler);
    return () => window.removeEventListener("open-comments-sidebar", handler);
  }, [setOpen]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "relative h-8 w-8 p-0 transition-colors",
        open
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-label="Comments"
      aria-pressed={open}
      onClick={toggle}
    >
      <MessageSquare className="h-4 w-4" />
    </Button>
  );
}

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
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 px-4">
            <span className="text-sm font-medium text-foreground">
              {entityContext ? `${entityContext.label} Comments` : "Comments"}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close comments"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
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
              <ClientSideSuspense
                fallback={
                  <div className="flex-1 space-y-3 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg p-3">
                        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                }
              >
                <RoomProvider
                  id={getRoomId(entityContext.entityType, entityContext.entityId)}
                  initialPresence={{ cursor: null }}
                  initialStorage={INITIAL_STORAGE}
                >
                  <div className="flex-1 overflow-y-auto p-4">
                    <EntityComments title="" />
                  </div>
                </RoomProvider>
              </ClientSideSuspense>
            </CommentsErrorBoundary>
          )}
        </div>
      )}
    </div>
  );
}
