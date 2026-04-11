import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; changeEventId: string }>;
}

// Two-tier workflow enforcement:
// Change events must go to PCO first, then approved PCOs can be converted to CO.
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { projectId, changeEventId } = await params;
  const numericProjectId = Number.parseInt(projectId, 10);

  if (Number.isNaN(numericProjectId) || numericProjectId <= 0) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const guard = await requirePermission(numericProjectId, "change_orders", "admin");
  if (guard.denied) return guard.response;

  return NextResponse.json(
    {
      error: "Direct CE to CO conversion is disabled for two-tier workflow",
      details:
        "Create a Potential Change Order (PCO) first using /api/projects/[projectId]/change-events/add-to-pco, then convert approved PCOs to change orders.",
      projectId: numericProjectId,
      changeEventId,
    },
    { status: 409 },
  );
}
