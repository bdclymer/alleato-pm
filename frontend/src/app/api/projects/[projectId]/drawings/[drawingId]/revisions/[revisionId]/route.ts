import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DrawingService } from "@/services/DrawingService";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * PATCH /api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]
 * Update the revision_number on a drawing revision
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      projectId: string;
      drawingId: string;
      revisionId: string;
    }>;
  },
) {
  const { drawingId, revisionId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { revision_number } = body;

    if (!revision_number || typeof revision_number !== "string" || revision_number.trim() === "") {
      return NextResponse.json(
        { error: "revision_number is required and must be a non-empty string" },
        { status: 400 },
      );
    }

    const service = new DrawingService(createServiceClient());
    const result = await service.updateRevisionNumber(
      drawingId,
      revisionId,
      revision_number.trim(),
    );

    if (result.error) {
      const statusCode = result.error.type === "NOT_FOUND" ? 404 : 500;
      return apiErrorResponse(result.error);
    }

    return NextResponse.json(result.data);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to update revision",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
