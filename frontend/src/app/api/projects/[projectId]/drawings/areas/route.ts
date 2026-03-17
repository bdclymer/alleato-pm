import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DrawingAreaService } from "@/services/DrawingAreaService";

/**
 * GET /api/projects/[projectId]/drawing-areas
 * List all drawing areas for a project with counts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new DrawingAreaService(createServiceClient());
  const result = await service.list(projectId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(result.data);
}

/**
 * POST /api/projects/[projectId]/drawing-areas
 * Create a new drawing area
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
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
    const result = await service.create(projectId, body, user.id);

    if (result.error) {
      const statusCode =
        result.error.type === "INVALID_INPUT" ? 400 : 500;

      return NextResponse.json(
        { error: result.error.message },
        { status: statusCode },
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to create drawing area",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
