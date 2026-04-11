import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

const createPackageSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  description: z.string().nullable().optional(),
});

/**
 * GET /api/projects/[projectId]/submittals/packages
 * Returns submittal packages for the project ordered by name.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("submittal_packages")
      .select("id, name, description")
      .eq("project_id", parseInt(projectId, 10))
      .order("name");

    if (error) return apiErrorResponse(error);

    return NextResponse.json(data ?? []);
  } catch (err) {
    return apiErrorResponse(err);
  }
}

/**
 * POST /api/projects/[projectId]/submittals/packages
 * Creates a new submittal package for the project.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = createPackageSchema.parse(body);

    const { data, error } = await supabase
      .from("submittal_packages")
      .insert({
        project_id: parseInt(projectId, 10),
        name,
        description: description ?? null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }
    return apiErrorResponse(error);
  }
}
