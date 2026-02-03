import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DrawingService } from "@/services/DrawingService";

/**
 * GET /api/projects/[projectId]/drawings/[drawingId]
 * Get a single drawing by ID with full details
 */
export async function GET(
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

  const service = new DrawingService(supabase);
  const result = await service.getById(projectId, drawingId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.type === "NOT_FOUND" ? 404 : 500 },
    );
  }

  return NextResponse.json(result.data);
}

/**
 * PATCH /api/projects/[projectId]/drawings/[drawingId]
 * Update drawing metadata (not file - use revisions for that)
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

  try {
    const body = await request.json();

    const service = new DrawingService(supabase);
    const result = await service.update(projectId, drawingId, body);

    if (result.error) {
      const statusCode =
        result.error.type === "NOT_FOUND"
          ? 404
          : result.error.type === "DUPLICATE_DRAWING_NUMBER"
            ? 409
            : 500;

      return NextResponse.json(
        { error: result.error.message },
        { status: statusCode },
      );
    }

    return NextResponse.json(result.data);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to update drawing",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/drawings/[drawingId]
 * Delete a drawing and all associated data
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

  const service = new DrawingService(supabase);
  const result = await service.delete(projectId, drawingId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
