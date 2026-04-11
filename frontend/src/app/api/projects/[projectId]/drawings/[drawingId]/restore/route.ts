import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DrawingService } from "@/services/DrawingService";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * PATCH /api/projects/[projectId]/drawings/[drawingId]/restore
 * Restore a soft-deleted drawing from the recycle bin
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; drawingId: string }> },
) {
  const { projectId, drawingId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new DrawingService(createServiceClient());
  const result = await service.restore(projectId, drawingId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/projects/[projectId]/drawings/[drawingId]/restore
 * Permanently delete a drawing (from recycle bin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; drawingId: string }> },
) {
  const { projectId, drawingId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new DrawingService(createServiceClient());
  const result = await service.permanentDelete(projectId, drawingId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json({ success: true });
}
