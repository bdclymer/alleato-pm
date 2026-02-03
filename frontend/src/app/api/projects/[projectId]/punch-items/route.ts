import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PunchItemService } from "@/services/PunchItemService";
import type { PunchItemFilters } from "@/services/PunchItemService";

/**
 * GET /api/projects/[projectId]/punch-items
 * List punch items with optional filters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const numericProjectId = parseInt(projectId, 10);
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const filters: PunchItemFilters = {
    search: searchParams.get("search") || undefined,
    status: searchParams.get("status") || undefined,
    priority: searchParams.get("priority") || undefined,
    assignee_id: searchParams.get("assignee_id") || undefined,
    is_deleted: searchParams.get("is_deleted") === "true",
    page: searchParams.get("page")
      ? Number(searchParams.get("page"))
      : undefined,
    page_size: searchParams.get("page_size")
      ? Number(searchParams.get("page_size"))
      : undefined,
  };

  const service = new PunchItemService(supabase);
  const result = await service.list(numericProjectId, filters);

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(result.data);
}

/**
 * POST /api/projects/[projectId]/punch-items
 * Create a new punch item
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const numericProjectId = parseInt(projectId, 10);
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

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 },
      );
    }

    const service = new PunchItemService(supabase);
    const result = await service.create(numericProjectId, body, user.id);

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create punch item" },
      { status: 500 },
    );
  }
}
