"use client";

import * as React from "react";
import { useParams, usePathname } from "next/navigation";

import type { CommentableEntityType } from "@/lib/liveblocks/rooms";

interface EntityContext {
  entityType: CommentableEntityType;
  entityId: string;
  label: string;
  projectId?: number;
}

/** Build a stable entity context for non-project routes so comments stay available. */
function getPageEntityContext(pathname: string): EntityContext {
  const normalizedPath = pathname === "/" ? "home" : pathname.slice(1);
  const routeSlug = normalizedPath.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/\//g, "-");

  return {
    entityType: "correspondence",
    entityId: `page-${routeSlug || "home"}`,
    label: pathname === "/" ? "Workspace" : pathname,
  };
}

/**
 * Map the current URL path to an entity context for collaboration features.
 * Kept outside comments-sidebar so non-comment UI can derive route context
 * without importing the Liveblocks client runtime.
 */
export function useEntityContext(): EntityContext | null {
  const params = useParams()! ?? {};
  const pathname = usePathname()! ?? "";

  return React.useMemo(() => {
    const projectId = params.projectId as string | undefined;
    if (!projectId) return getPageEntityContext(pathname);
    const numericProjectId = Number.parseInt(projectId, 10);

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
      "change-events": { entityType: "change-event", label: "Change Event" },
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
    if (!mapping) return getPageEntityContext(pathname);

    if (isDetailPage) {
      return {
        entityType: mapping.entityType,
        entityId: detailId,
        label: `${mapping.label} #${detailId}`,
        projectId: Number.isFinite(numericProjectId) ? numericProjectId : undefined,
      };
    }

    return {
      entityType: mapping.entityType,
      entityId: `project-${projectId}`,
      label: mapping.label,
      projectId: Number.isFinite(numericProjectId) ? numericProjectId : undefined,
    };
  }, [params, pathname]);
}
