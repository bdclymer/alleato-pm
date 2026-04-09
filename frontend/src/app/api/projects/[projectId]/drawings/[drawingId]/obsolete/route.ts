import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DrawingService } from "@/services/DrawingService";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * PATCH /api/projects/[projectId]/drawings/[drawingId]/obsolete
 * Mark a drawing as obsolete (is_obsolete = true)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; drawingId: string }> },
) {
  const { projectId, drawingId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new DrawingService(createServiceClient());
  const result = await service.markObsolete(projectId, drawingId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
}

/**
 * DELETE /api/projects/[projectId]/drawings/[drawingId]/obsolete
 * Restore a drawing from obsolete (is_obsolete = false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; drawingId: string }> },
) {
  const { projectId, drawingId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new DrawingService(createServiceClient());
  const result = await service.restoreObsolete(projectId, drawingId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
}
