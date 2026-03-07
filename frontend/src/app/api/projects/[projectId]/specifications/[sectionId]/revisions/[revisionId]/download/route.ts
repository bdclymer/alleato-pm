import { NextRequest, NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SpecificationRevisionService } from "@/services/SpecificationRevisionService";

/**
 * GET /api/projects/[projectId]/specifications/[sectionId]/revisions/[revisionId]/download
 * Get signed download URL for a revision file
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

  // Verify authentication
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new SpecificationRevisionService(createServiceClient());
  const result = await service.getDownloadUrl(revisionId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.type === "NOT_FOUND" ? 404 : 500 },
    );
  }

  // Return signed URL
  return NextResponse.json({ url: result.data });
}
