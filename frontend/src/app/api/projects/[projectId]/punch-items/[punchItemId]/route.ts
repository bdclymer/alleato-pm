import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PunchItemService } from "@/services/PunchItemService";

/**
 * GET /api/projects/[projectId]/punch-items/[punchItemId]
 * Get a single punch item
 */
export async function GET(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ projectId: string; punchItemId: string }> },
) {
  const { projectId, punchItemId } = await params;
  const numericProjectId = parseInt(projectId, 10);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new PunchItemService(supabase);
  const result = await service.getById(numericProjectId, punchItemId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.type === "NOT_FOUND" ? 404 : 500 },
    );
  }

  return NextResponse.json(result.data);
}

/**
 * PATCH /api/projects/[projectId]/punch-items/[punchItemId]
 * Update a punch item
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ projectId: string; punchItemId: string }> },
) {
  const { projectId, punchItemId } = await params;
  const numericProjectId = parseInt(projectId, 10);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const service = new PunchItemService(supabase);
    const result = await service.update(
      numericProjectId,
      punchItemId,
      body,
      user.id,
    );

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.type === "NOT_FOUND" ? 404 : 500 },
      );
    }

    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json(
      { error: "Failed to update punch item" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/punch-items/[punchItemId]
 * Soft delete a punch item (moves to recycle bin)
 */
export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ projectId: string; punchItemId: string }> },
) {
  const { projectId, punchItemId } = await params;
  const numericProjectId = parseInt(projectId, 10);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new PunchItemService(supabase);
  const result = await service.softDelete(
    numericProjectId,
    punchItemId,
    user.id,
  );

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.type === "NOT_FOUND" ? 404 : 500 },
    );
  }

  return NextResponse.json({ success: true });
}
