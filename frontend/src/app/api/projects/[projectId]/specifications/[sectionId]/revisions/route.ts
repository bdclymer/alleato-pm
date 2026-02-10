import { NextRequest, NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SpecificationRevisionService } from "@/services/SpecificationRevisionService";
import {
  addRevisionSchema,
  type AddRevisionFormData,
} from "@/lib/schemas/specification-schemas";

/**
 * GET /api/projects/[projectId]/specifications/[sectionId]/revisions
 * List all revisions for a specification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; sectionId: string }> },
) {
  const { projectId, sectionId } = await params;
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role client for data queries (bypasses RLS)
  const serviceClient = createServiceClient();
  const service = new SpecificationRevisionService(serviceClient);
  const result = await service.listRevisions(projectId, sectionId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.type === "NOT_FOUND" ? 404 : 500 },
    );
  }

  return NextResponse.json(result.data);
}

/**
 * POST /api/projects/[projectId]/specifications/[sectionId]/revisions
 * Add a new revision to a specification
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; sectionId: string }> },
) {
  const { projectId, sectionId } = await params;
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse multipart form data
    const formData = await request.formData();

    const revisionData: AddRevisionFormData = {
      file: formData.get("file") as File,
      notes: (formData.get("notes") as string) || undefined,
      notify_subscribers: formData.get("notify_subscribers") === "true",
    };

    // Validate with Zod
    const validated = addRevisionSchema.parse(revisionData);

    // Use service role client for write operations (bypasses RLS)
    const serviceClient = createServiceClient();
    const service = new SpecificationRevisionService(serviceClient);
    const result = await service.addRevision(
      projectId,
      sectionId,
      validated,
      user.id,
    );

    if (result.error) {
      const statusCode =
        result.error.type === "FILE_TOO_LARGE" ||
        result.error.type === "INVALID_FILE_TYPE"
          ? 400
          : result.error.type === "NOT_FOUND"
            ? 404
            : 500;

      return NextResponse.json({ error: result.error.message }, { status: statusCode });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: err.message },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to add revision" }, { status: 500 });
  }
}
