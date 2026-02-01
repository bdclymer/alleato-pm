import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SpecificationAreaService } from "@/services/SpecificationAreaService";
import {
  specificationAreaSchema,
  type SpecificationAreaFormData,
} from "@/lib/schemas/specification-schemas";

/**
 * GET /api/projects/[projectId]/specifications/areas
 * List all areas for a project
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

  const service = new SpecificationAreaService(supabase);
  const result = await service.listAreas(projectId);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
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
    const result = await service.createArea(projectId, validated);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 409 });
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
