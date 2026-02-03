import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DrawingService } from "@/services/DrawingService";

/**
 * GET /api/projects/[projectId]/drawings/[drawingId]/revisions
 * List all revisions for a drawing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; drawingId: string }> },
) {
  const { drawingId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new DrawingService(supabase);
  const result = await service.listRevisions(drawingId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(result.data);
}

/**
 * POST /api/projects/[projectId]/drawings/[drawingId]/revisions
 * Create a new revision for a drawing with file upload
 */
export async function POST(
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
    // Parse multipart form data
    const formData = await request.formData();

    const revisionNumber = formData.get("revision_number") as string;
    const receivedDate = formData.get("received_date") as string;
    const drawingDate = (formData.get("drawing_date") as string) || undefined;
    const drawingSetId = (formData.get("drawing_set_id") as string) || undefined;
    const status = (formData.get("status") as string) || undefined;
    const description = (formData.get("description") as string) || undefined;
    const file = formData.get("file") as File;

    // Validate required fields
    if (!revisionNumber || !receivedDate || !file) {
      return NextResponse.json(
        {
          error: "Missing required fields: revision_number, received_date, file",
        },
        { status: 400 },
      );
    }

    const service = new DrawingService(supabase);

    // Step 1: Upload the file
    const uploadResult = await service.uploadFile(projectId, drawingId, file);

    if (uploadResult.error) {
      const statusCode =
        uploadResult.error.type === "FILE_TOO_LARGE" ? 400 : 500;
      return NextResponse.json(
        { error: uploadResult.error.message },
        { status: statusCode },
      );
    }

    // Step 2: Create the revision
    const revisionResult = await service.createRevision(
      drawingId,
      {
        revision_number: revisionNumber,
        drawing_set_id: drawingSetId,
        drawing_date: drawingDate,
        received_date: receivedDate,
        status: status || "active",
        file_url: uploadResult.data.url,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        description,
      },
      user.id,
    );

    if (revisionResult.error) {
      // Clean up uploaded file if revision creation fails
      // Note: File path cleanup could be added here if needed
      return NextResponse.json(
        { error: revisionResult.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(revisionResult.data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to create revision",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
