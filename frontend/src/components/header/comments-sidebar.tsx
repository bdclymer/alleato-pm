"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { RoomProvider } from "@liveblocks/react/suspense";
import { LiveList, LiveObject } from "@liveblocks/client";
import { EntityComments } from "@/components/comments/entity-comments";
import { getRoomId, type CommentableEntityType } from "@/lib/liveblocks/rooms";

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

    // Extract the tool segment from the path: /43/budget → "budget"
    const segments = pathname.split("/").filter(Boolean);
    const projectIndex = segments.indexOf(projectId);
    if (projectIndex === -1) return null;

    const toolSegment = segments[projectIndex + 1];
    if (!toolSegment) return null;

    // Detail pages: /43/rfis/[rfiId] → rfi entity
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

    // List/overview page — scope comments to the project+tool
    return {
      entityType: mapping.entityType,
      entityId: `project-${projectId}`,
      label: mapping.label,
    };
  }, [params, pathname]);
}

// ── Main component ──────────────────────────────────────────────────────────

/** Open the comments sidebar from anywhere in the app */
export function openCommentsSidebar() {
  window.dispatchEvent(new CustomEvent("open-comments-sidebar"));
}

export function CommentsSidebar() {
  const [open, setOpen] = React.useState(false);
  const entityContext = useEntityContext();

  // Listen for external open requests (e.g. from budget header chat button)
  React.useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-comments-sidebar", handler);
    return () => window.removeEventListener("open-comments-sidebar", handler);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="relative h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        aria-label="Comments"
        onClick={() => setOpen(true)}
      >
        <MessageSquare />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-[420px] p-0 sm:max-w-[420px] flex flex-col"
        >
          {!entityContext ? (
            <div className="flex flex-col">
              <SheetHeader className="border-b border-border/40 px-6 py-4">
                <SheetTitle className="text-base">Comments</SheetTitle>
              </SheetHeader>
              <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
                <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-foreground/80">
                  No comments available
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Navigate to a project tool to view comments
                </p>
              </div>
            </div>
          ) : (
            <CommentsErrorBoundary
              fallback={
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Comments unavailable
                  </p>
                </div>
              }
            >
              <ClientSideSuspense
                fallback={
                  <div className="flex flex-col">
                    <SheetHeader className="border-b border-border/40 px-6 py-4">
                      <SheetTitle className="text-base">
                        Comments
                      </SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 space-y-3 p-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-lg p-3"
                        >
                          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                }
              >
                <RoomProvider
                  id={getRoomId(entityContext.entityType, entityContext.entityId)}
                  initialPresence={{ cursor: null }}
                  initialStorage={INITIAL_STORAGE}
                >
                  <CommentsSidebarContent label={entityContext.label} />
                </RoomProvider>
              </ClientSideSuspense>
            </CommentsErrorBoundary>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ── Sidebar content ─────────────────────────────────────────────────────────

function CommentsSidebarContent({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b border-border/40 px-6 py-4 space-y-0">
        <SheetTitle className="text-base">{label} Comments</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto p-4">
        <EntityComments title="" />
      </div>
    </div>
  );
}
