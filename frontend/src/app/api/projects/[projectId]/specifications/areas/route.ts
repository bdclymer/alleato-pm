import { NextRequest, NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SpecificationAreaService } from "@/services/SpecificationAreaService";
import {
  specificationAreaSchema,
  type SpecificationAreaFormData,
} from "@/lib/schemas/specification-schemas";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[projectId]/specifications/areas
 * List all areas for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role client for data queries (bypasses RLS)
  const serviceClient = createServiceClient();
  const service = new SpecificationAreaService(serviceClient);
  const result = await service.listAreas(projectId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
}

/**
 * POST /api/projects/[projectId]/specifications/areas
 * Create a new area
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate with Zod
    const validated: SpecificationAreaFormData =
      specificationAreaSchema.parse(body);

    // Use service role client for write operations (bypasses RLS)
    const serviceClient = createServiceClient();
    const service = new SpecificationAreaService(serviceClient);
    const result = await service.createArea(projectId, validated);

    if (result.error) {
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
    return NextResponse.json({ error: "Failed to create area" }, { status: 500 });
  }
}
