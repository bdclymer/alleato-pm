import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DrawingSetService } from "@/services/DrawingSetService";

/**
 * GET /api/projects/[projectId]/drawing-sets
 * List all drawing sets for a project
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

  const serviceClient = createServiceClient();
  const service = new DrawingSetService(serviceClient);
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
 * POST /api/projects/[projectId]/drawing-sets
 * Create a new drawing set
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

    // Validate required fields
    if (!body.name || !body.issued_at) {
      return NextResponse.json(
        { error: "Missing required fields: name, issued_at" },
        { status: 400 },
      );
    }

    const serviceClient = createServiceClient();
    const service = new DrawingSetService(serviceClient);
    const result = await service.create(projectId, body, user.id);

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to create drawing set",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
