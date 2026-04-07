import { NextRequest, NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SpecificationRevisionService } from "@/services/SpecificationRevisionService";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]
 * Get a specific revision
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string; sectionId: string; revisionId: string }>;
  },
) {
  const { revisionId } = await params;
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role client for data queries (bypasses RLS)
  const serviceClient = createServiceClient();
  const service = new SpecificationRevisionService(serviceClient);
  const result = await service.getRevision(revisionId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
}

/**
 * DELETE /api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]
 * Delete a revision (except current revision)
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string; sectionId: string; revisionId: string }>;
  },
) {
  const { projectId, sectionId, revisionId } = await params;
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role client for write operations (bypasses RLS)
  const serviceClient = createServiceClient();
  const service = new SpecificationRevisionService(serviceClient);
  const result = await service.deleteRevision(projectId, sectionId, revisionId);

  if (result.error) {
    const statusCode =
      result.error.type === "NOT_FOUND"
        ? 404
        : result.error.type === "REVISION_CONFLICT"
          ? 409
          : 500;

    return apiErrorResponse(result.error);
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

/**
 * PATCH /api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]
 * Set as current revision
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string; sectionId: string; revisionId: string }>;
  },
) {
  const { projectId, sectionId, revisionId } = await params;
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role client for write operations (bypasses RLS)
  const serviceClient = createServiceClient();
  const service = new SpecificationRevisionService(serviceClient);
  const result = await service.setCurrentRevision(projectId, sectionId, revisionId);

  if (result.error) {
    const statusCode =
      result.error.type === "NOT_FOUND"
        ? 404
        : result.error.type === "REVISION_CONFLICT"
          ? 409
          : 500;

    return apiErrorResponse(result.error);
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
