import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DrawingSetService } from "@/services/DrawingSetService";

/**
 * PATCH /api/projects/[projectId]/drawing-sets/[setId]
 * Update a drawing set
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; setId: string }> },
) {
  const { setId } = await params;
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

    const service = new DrawingSetService(createServiceClient());
    const result = await service.update(setId, body);

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(result.data);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to update drawing set",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/projects/[projectId]/drawing-sets/[setId]
 * Archive a drawing set (using POST with action parameter)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; setId: string }> },
) {
  const { setId } = await params;
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

    // Check if action is archive
    if (body.action !== "archive") {
      return NextResponse.json(
        { error: "Invalid action. Only 'archive' action is supported." },
        { status: 400 },
      );
    }

    const service = new DrawingSetService(createServiceClient());
    const result = await service.archive(setId);

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(result.data);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to archive drawing set",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
