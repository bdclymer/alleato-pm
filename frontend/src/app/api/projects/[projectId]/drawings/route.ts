import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DrawingService } from "@/services/DrawingService";
import type { DrawingFilters } from "@/services/DrawingService";
import { apiErrorResponse } from "@/lib/api-error";

interface FinalizeDrawingUploadRequest {
  drawing_number: string;
  title: string;
  discipline?: string;
  drawing_type?: string;
  area_id?: string;
  revision_number: string;
  received_date: string;
  drawing_date?: string;
  description?: string;
  drawing_set_id?: string;
  upload_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
}

/**
 * GET /api/projects/[projectId]/drawings
 * List drawings with optional filters
 */
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/drawings#GET",
  async ({ request, params }) => {
  const { projectId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/drawings#GET", message: "Authentication required." });
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
    include_unpublished: searchParams.get("include_unpublished") === "true",
    include_obsolete: searchParams.get("include_obsolete") === "true",
  };

  const service = new DrawingService(createServiceClient());
  const result = await service.list(projectId, filters);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
  },
);

/**
 * POST /api/projects/[projectId]/drawings
 * Create a new drawing with file upload
 */
export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/drawings#POST",
  async ({ request, params }) => {
  const { projectId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/drawings#POST", message: "Authentication required." });
  }

  const serviceClient = createServiceClient();
  const service = new DrawingService(serviceClient);

  /** Removes an uploaded object when the DB write path fails. */
  const cleanupUploadedFile = async (uploadPath: string | undefined) => {
    if (!uploadPath) return;
    await serviceClient.storage.from("project-files").remove([uploadPath]);
  };

  try {
    const contentType = request.headers.get("content-type") || "";
    const isMultipart = contentType.includes("multipart/form-data");

    let drawingNumber = "";
    let title = "";
    let discipline: string | undefined;
    let drawingType: string | undefined;
    let areaId: string | undefined;
    let revisionNumber = "";
    let receivedDate = "";
    let drawingDate: string | undefined;
    let description: string | undefined;
    let drawingSetId: string | undefined;
    let fileName = "";
    let fileSize = 0;
    let fileType = "";
    let uploadPath: string | undefined;
    let fileUrl = "";
    let uploadFile: File | undefined;

    if (isMultipart) {
      const formData = await request.formData();
      const file = formData.get("file") as File;

      drawingNumber = formData.get("drawing_number") as string;
      title = formData.get("title") as string;
      discipline = (formData.get("discipline") as string) || undefined;
      drawingType = (formData.get("drawing_type") as string) || undefined;
      areaId = (formData.get("area_id") as string) || undefined;
      revisionNumber = formData.get("revision_number") as string;
      receivedDate = formData.get("received_date") as string;
      drawingDate = (formData.get("drawing_date") as string) || undefined;
      description = (formData.get("description") as string) || undefined;
      drawingSetId = (formData.get("drawing_set_id") as string) || undefined;

      if (!drawingNumber || !title || !revisionNumber || !receivedDate || !file) {
        return NextResponse.json(
          {
            error: "Missing required fields: drawing_number, title, revision_number, received_date, file",
          },
          { status: 400 },
        );
      }

      fileName = file.name;
      fileSize = file.size;
      fileType = file.type;
      uploadFile = file;
    } else {
      const body = (await request.json()) as FinalizeDrawingUploadRequest;

      drawingNumber = body.drawing_number;
      title = body.title;
      discipline = body.discipline;
      drawingType = body.drawing_type;
      areaId = body.area_id;
      revisionNumber = body.revision_number;
      receivedDate = body.received_date;
      drawingDate = body.drawing_date;
      description = body.description;
      drawingSetId = body.drawing_set_id;
      uploadPath = body.upload_path;
      fileName = body.file_name;
      fileSize = body.file_size;
      fileType = body.file_type;

      if (
        !drawingNumber ||
        !title ||
        !revisionNumber ||
        !receivedDate ||
        !uploadPath ||
        !fileName ||
        !Number.isFinite(fileSize) ||
        fileSize <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Missing required fields: drawing_number, title, revision_number, received_date, upload_path, file_name, file_size",
          },
          { status: 400 },
        );
      }

      const { data: publicUrlData } = serviceClient.storage
        .from("project-files")
        .getPublicUrl(uploadPath);
      fileUrl = publicUrlData.publicUrl;
    }

    // Duplicate detection: check if drawing_number already exists in this project
    const { data: existing } = await serviceClient
      .from("drawings")
      .select("id, drawing_number, title")
      .eq("project_id", Number.parseInt(projectId, 10))
      .eq("drawing_number", drawingNumber)
      .maybeSingle();

    if (existing) {
      if (!isMultipart) {
        await cleanupUploadedFile(uploadPath);
      }
      return NextResponse.json(
        { error: "DUPLICATE_DRAWING_NUMBER", existing_drawing: existing },
        { status: 409 },
      );
    }

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
      if (!isMultipart) {
        await cleanupUploadedFile(uploadPath);
      }
      return apiErrorResponse(createResult.error);
    }

    const drawing = createResult.data;

    if (isMultipart) {
      if (!uploadFile) {
        await service.delete(projectId, drawing.id);
        return NextResponse.json(
          { error: "Missing upload file for multipart request" },
          { status: 400 },
        );
      }

      const uploadResult = await service.uploadFile(projectId, drawing.id, uploadFile);
      if (uploadResult.error) {
        await service.delete(projectId, drawing.id);
        return apiErrorResponse(uploadResult.error);
      }
      fileUrl = uploadResult.data.url;
      uploadPath = uploadResult.data.path;
    }

    // Step 3: Create the first revision with the uploaded file
    const revisionResult = await service.createRevision(
      drawing.id,
      {
        revision_number: revisionNumber,
        drawing_set_id: drawingSetId,
        drawing_date: drawingDate,
        received_date: receivedDate,
        status: "approved",
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        description,
      },
      user.id,
    );

    if (revisionResult.error) {
      // Rollback: delete the drawing and file if revision creation fails
      await service.delete(projectId, drawing.id);
      if (!isMultipart) {
        await cleanupUploadedFile(uploadPath);
      }

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
  },
);
