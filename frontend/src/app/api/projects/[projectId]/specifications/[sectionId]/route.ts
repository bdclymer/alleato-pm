import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SpecificationService } from "@/services/SpecificationService";
import {
  editSpecificationSchema,
  type EditSpecificationFormData,
} from "@/lib/schemas/specification-schemas";

/**
 * GET /api/projects/[projectId]/specifications/[sectionId]
 * Get a single specification with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; sectionId: string }> },
) {
  const { projectId, sectionId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new SpecificationService(supabase);
  const result = await service.getById(projectId, sectionId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.type === "NOT_FOUND" ? 404 : 500 },
    );
  }

  return NextResponse.json(result.data);
}

/**
 * PATCH /api/projects/[projectId]/specifications/[sectionId]
 * Update specification metadata (not file)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; sectionId: string }> },
) {
  const { projectId, sectionId } = await params;
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
    const validated: EditSpecificationFormData =
      editSpecificationSchema.parse(body);

    const service = new SpecificationService(supabase);
    const result = await service.update(projectId, sectionId, validated, user.id);

    if (result.error) {
      const statusCode =
        result.error.type === "NOT_FOUND"
          ? 404
          : result.error.type === "DUPLICATE_SECTION_NUMBER"
            ? 409
            : 500;

      return NextResponse.json({ error: result.error.message }, { status: statusCode });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: err.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update specification" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/specifications/[sectionId]
 * Delete a specification and all associated data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; sectionId: string }> },
) {
  const { projectId, sectionId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new SpecificationService(supabase);
  const result = await service.delete(projectId, sectionId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.type === "NOT_FOUND" ? 404 : 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
