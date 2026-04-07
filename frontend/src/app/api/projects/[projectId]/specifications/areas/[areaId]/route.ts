import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SpecificationAreaService } from "@/services/SpecificationAreaService";
import {
  specificationAreaSchema,
  type SpecificationAreaFormData,
} from "@/lib/schemas/specification-schemas";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[projectId]/specifications/areas/[areaId]
 * Get a single area with section count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; areaId: string }> },
) {
  const { projectId, areaId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new SpecificationAreaService(supabase);
  const result = await service.getArea(projectId, areaId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
}

/**
 * PATCH /api/projects/[projectId]/specifications/areas/[areaId]
 * Update an area
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; areaId: string }> },
) {
  const { projectId, areaId } = await params;
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

    // Validate with Zod
    const validated: SpecificationAreaFormData =
      specificationAreaSchema.parse(body);

    const service = new SpecificationAreaService(supabase);
    const result = await service.updateArea(projectId, areaId, validated);

    if (result.error) {
      const statusCode = result.error.type === "NOT_FOUND" ? 404 : 409;
      return apiErrorResponse(result.error);
    }

    return NextResponse.json(result.data);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: err.message },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to update area" }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[projectId]/specifications/areas/[areaId]
 * Delete an area
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; areaId: string }> },
) {
  const { projectId, areaId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new SpecificationAreaService(supabase);
  const result = await service.deleteArea(projectId, areaId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
