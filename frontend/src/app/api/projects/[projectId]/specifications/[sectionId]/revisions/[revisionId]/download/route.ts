import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new SpecificationRevisionService(supabase);
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
