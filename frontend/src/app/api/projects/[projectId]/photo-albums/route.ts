import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

const createAlbumSchema = z.object({
  name: z.string().min(1, "Album name is required").max(100),
  description: z.string().nullable().optional(),
});

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("photo_albums")
      .select("*")
      .eq("project_id", parseInt(projectId, 10))
      .order("name", { ascending: true });

    if (error) return apiErrorResponse(error);
    return NextResponse.json(data ?? []);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

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
    const validated = createAlbumSchema.parse(body);

    const { data, error } = await supabase
      .from("photo_albums")
      .insert({
        ...validated,
        project_id: parseInt(projectId, 10),
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) return apiErrorResponse(error);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
