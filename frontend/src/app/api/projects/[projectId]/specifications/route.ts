import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SpecificationService } from "@/services/SpecificationService";
import {
  uploadSpecificationSchema,
  type UploadSpecificationFormData,
} from "@/lib/schemas/specification-schemas";
import type { SpecificationFilters } from "@/types/specifications.types";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[projectId]/specifications
 * List specifications with optional filters
 */
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/specifications#GET",
  async ({ request, params }) => {
  const { projectId } = await params;
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/specifications#GET", message: "Authentication required." });
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const filters: SpecificationFilters = {
    search: searchParams.get("search") || undefined,
    area_id: searchParams.get("area_id")
      ? Number(searchParams.get("area_id"))
      : undefined,
    status: (searchParams.get("status") as any) || undefined,
    uploaded_after: searchParams.get("uploaded_after") || undefined,
    uploaded_before: searchParams.get("uploaded_before") || undefined,
    page: searchParams.get("page")
      ? Number(searchParams.get("page"))
      : undefined,
    page_size: searchParams.get("page_size")
      ? Number(searchParams.get("page_size"))
      : undefined,
  };

  // Use service role client for data queries (bypasses RLS)
  const serviceClient = createServiceClient();
  const service = new SpecificationService(serviceClient);
  const result = await service.list(projectId, filters);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
  },
);

/**
 * POST /api/projects/[projectId]/specifications
 * Create a new specification with file upload
 */
export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/specifications#POST",
  async ({ request, params }) => {
  const { projectId } = await params;
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/specifications#POST", message: "Authentication required." });
  }

  try {
    // Parse multipart form data
    const formData = await request.formData();

    const uploadData: UploadSpecificationFormData = {
      section_number: formData.get("section_number") as string,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      file: formData.get("file") as File,
      notes: (formData.get("notes") as string) || undefined,
      area_ids: formData.get("area_ids")
        ? JSON.parse(formData.get("area_ids") as string)
        : undefined,
      subscriber_ids: formData.get("subscriber_ids")
        ? JSON.parse(formData.get("subscriber_ids") as string)
        : undefined,
    };

    // Validate with Zod
    const validated = uploadSpecificationSchema.parse(uploadData);

    // Use service role client for write operations (bypasses RLS)
    // Auth is already verified above via cookie-based client
    const serviceClient = createServiceClient();
    const service = new SpecificationService(serviceClient);
    const result = await service.create(projectId, validated, user.id);

    if (result.error) {
      const statusCode =
        result.error.type === "FILE_TOO_LARGE" ||
        result.error.type === "INVALID_FILE_TYPE"
          ? 400
          : result.error.type === "DUPLICATE_SECTION_NUMBER"
            ? 409
            : 500;

      return apiErrorResponse(result.error);
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: err.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create specification" },
      { status: 500 },
    );
  }
  },
);
