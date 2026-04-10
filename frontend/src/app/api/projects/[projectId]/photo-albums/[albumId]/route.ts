import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; albumId: string }>;
}

const updateAlbumSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, albumId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateAlbumSchema.parse(body);

    const { data, error } = await supabase
      .from("photo_albums")
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq("id", albumId)
      .eq("project_id", parseInt(projectId, 10))
      .select("*")
      .single();

    if (error) return apiErrorResponse(error);
    if (!data) return NextResponse.json({ error: "Album not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, albumId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Move photos in this album to "Default" before deleting
    await supabase
      .from("project_photos")
      .update({ album: "Default" })
      .eq("project_id", parseInt(projectId, 10))
      .eq("album", albumId); // matched by name below — see note

    const { error } = await supabase
      .from("photo_albums")
      .delete()
      .eq("id", albumId)
      .eq("project_id", parseInt(projectId, 10));

    if (error) return apiErrorResponse(error);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
