import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; photoId: string }>;
}

const updatePhotoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  album: z.string().nullable().optional(),
  file_name: z.string().min(1).optional(),
  file_url: z.string().min(1).optional(),
  file_size: z.number().nullable().optional(),
  content_type: z.string().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  date_taken: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  trade: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  is_private: z.boolean().nullable().optional(),
  starred: z.boolean().nullable().optional(),
});

/**
 * GET /api/projects/[projectId]/photos/[photoId]
 * Returns a single photo by ID.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, photoId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("project_photos")
      .select("*")
      .eq("id", parseInt(photoId, 10))
      .eq("project_id", parseInt(projectId, 10))
      .is("deleted_at", null)
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    if (!data) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * PUT /api/projects/[projectId]/photos/[photoId]
 * Updates a photo record.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, photoId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validatedData = updatePhotoSchema.parse(body);

    const { data, error } = await supabase
      .from("project_photos")
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(photoId, 10))
      .eq("project_id", parseInt(projectId, 10))
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    if (!data) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }
    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/projects/[projectId]/photos/[photoId]
 * Soft-deletes a photo by default. Pass ?permanent=true to hard-delete.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, photoId } = await params;
    const supabase = await createClient();
    const permanent = new URL(request.url).searchParams.get("permanent") === "true";

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (permanent) {
      const { error } = await supabase
        .from("project_photos")
        .delete()
        .eq("id", parseInt(photoId, 10))
        .eq("project_id", parseInt(projectId, 10));

      if (error) return apiErrorResponse(error);
      return NextResponse.json({ success: true });
    }

    const { data, error } = await supabase
      .from("project_photos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", parseInt(photoId, 10))
      .eq("project_id", parseInt(projectId, 10))
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    if (!data) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
