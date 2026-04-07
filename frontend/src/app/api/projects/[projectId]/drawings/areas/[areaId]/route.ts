import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DrawingAreaService } from "@/services/DrawingAreaService";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * PATCH /api/projects/[projectId]/drawing-areas/[areaId]
 * Update a drawing area
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; areaId: string }> },
) {
  const { areaId } = await params;
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

    const service = new DrawingAreaService(createServiceClient());
    const result = await service.update(areaId, body);

    if (result.error) {
      const statusCode =
        result.error.type === "NOT_FOUND"
          ? 404
          : result.error.type === "INVALID_INPUT"
            ? 400
            : 500;

      return apiErrorResponse(result.error);
    }

    return NextResponse.json(result.data);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to update drawing area",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/drawing-areas/[areaId]
 * Delete a drawing area
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; areaId: string }> },
) {
  const { areaId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new DrawingAreaService(createServiceClient());
  const result = await service.delete(areaId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data, { status: 200 });
}
