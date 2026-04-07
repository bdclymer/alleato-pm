import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DrawingService } from "@/services/DrawingService";
import type { DrawingFilters } from "@/services/DrawingService";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[projectId]/drawings
 * List drawings with optional filters
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

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const filters: DrawingFilters = {
    search: searchParams.get("search") || undefined,
    area_id: searchParams.get("area_id") || undefined,
    discipline: searchParams.get("discipline") || undefined,
    status: searchParams.get("status") || undefined,
    set_id: searchParams.get("set_id") || undefined,
    page: searchParams.get("page")
      ? Number(searchParams.get("page"))
      : undefined,
    page_size: searchParams.get("page_size")
      ? Number(searchParams.get("page_size"))
      : undefined,
  };

  const service = new DrawingService(createServiceClient());
  const result = await service.list(projectId, filters);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
}

/**
 * POST /api/projects/[projectId]/drawings
 * Create a new drawing with file upload
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
    // Parse multipart form data
    const formData = await request.formData();

    const drawingNumber = formData.get("drawing_number") as string;
    const title = formData.get("title") as string;
    const discipline = (formData.get("discipline") as string) || undefined;
    const drawingType = (formData.get("drawing_type") as string) || undefined;
    const areaId = (formData.get("area_id") as string) || undefined;
    const revisionNumber = formData.get("revision_number") as string;
    const receivedDate = formData.get("received_date") as string;
    const drawingDate = (formData.get("drawing_date") as string) || undefined;
    const description = (formData.get("description") as string) || undefined;
    const file = formData.get("file") as File;

    // Validate required fields
    if (!drawingNumber || !title || !revisionNumber || !receivedDate || !file) {
      return NextResponse.json(
        {
          error: "Missing required fields: drawing_number, title, revision_number, received_date, file",
        },
        { status: 400 },
      );
    }

    const service = new DrawingService(createServiceClient());

    // Step 1: Create the drawing
    const createResult = await service.create(
      projectId,
      {
        drawing_number: drawingNumber,
        title,
        discipline,
        drawing_type: drawingType,
        area_id: areaId,
      },
      user.id,
    );

    if (createResult.error) {
      const statusCode =
        createResult.error.type === "DUPLICATE_DRAWING_NUMBER" ? 409 : 500;
      return apiErrorResponse(createResult.error);
    }

    const drawing = createResult.data;

    // Step 2: Upload the file
    const uploadResult = await service.uploadFile(projectId, drawing.id, file);

    if (uploadResult.error) {
      // Rollback: delete the drawing if file upload fails
      await service.delete(projectId, drawing.id);

      const statusCode =
        uploadResult.error.type === "FILE_TOO_LARGE" ? 400 : 500;
      return apiErrorResponse(uploadResult.error);
    }

    // Step 3: Create the first revision with the uploaded file
    const revisionResult = await service.createRevision(
      drawing.id,
      {
        revision_number: revisionNumber,
        drawing_date: drawingDate,
        received_date: receivedDate,
        status: "approved",
        file_url: uploadResult.data.url,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        description,
      },
      user.id,
    );

    if (revisionResult.error) {
      // Rollback: delete the drawing and file if revision creation fails
      await service.delete(projectId, drawing.id);

      return apiErrorResponse(revisionResult.error);
    }

    // Fetch the complete drawing with revision
    const finalResult = await service.getById(projectId, drawing.id);

    if (finalResult.error) {
      return apiErrorResponse(finalResult.error);
    }

    return NextResponse.json(finalResult.data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to create drawing",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
