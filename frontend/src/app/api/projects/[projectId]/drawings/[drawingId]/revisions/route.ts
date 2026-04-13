import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DrawingService } from "@/services/DrawingService";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[projectId]/drawings/[drawingId]/revisions
 * List all revisions for a drawing
 */
export const GET = withApiGuardrails<{ projectId: string; drawingId: string }>(
  "projects/[projectId]/drawings/[drawingId]/revisions#GET",
  async ({ request, params }) => {
  const { drawingId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/drawings/[drawingId]/revisions#GET", message: "Authentication required." });
  }

  const service = new DrawingService(createServiceClient());
  const result = await service.listRevisions(drawingId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
  },
);

/**
 * POST /api/projects/[projectId]/drawings/[drawingId]/revisions
 * Create a new revision for a drawing with file upload
 */
export const POST = withApiGuardrails<{ projectId: string; drawingId: string }>(
  "projects/[projectId]/drawings/[drawingId]/revisions#POST",
  async ({ request, params }) => {
  const { projectId, drawingId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/drawings/[drawingId]/revisions#POST", message: "Authentication required." });
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

    const service = new DrawingService(createServiceClient());

    // Step 1: Upload the file
    const uploadResult = await service.uploadFile(projectId, drawingId, file);

    if (uploadResult.error) {
      const statusCode =
        uploadResult.error.type === "FILE_TOO_LARGE" ? 400 : 500;
      return apiErrorResponse(uploadResult.error);
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
      return apiErrorResponse(revisionResult.error);
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
  },
);
