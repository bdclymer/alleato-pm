import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  folder: z.string().nullable().optional().default("Root"),
  file_name: z.string().min(1, "File name is required"),
  file_url: z.string().min(1, "File URL is required"),
  file_size: z.number().nullable().optional(),
  content_type: z.string().nullable().optional(),
  version: z.number().nullable().optional().default(1),
  status: z.enum(["Draft", "Published", "Superseded", "Archived"]).optional().default("Draft"),
  category: z.string().nullable().optional(),
  is_private: z.boolean().nullable().optional().default(false),
  uploaded_by: z.string().nullable().optional(),
  reviewed_by: z.string().nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
});

// =============================================================================
// GET - List documents with filters
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    let query = supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", Number(projectId))
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (folder) {
      query = query.eq("folder", folder);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,file_name.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// =============================================================================
// POST - Create a document record
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createDocumentSchema.parse(body);

    const { data, error } = await supabase
      .from("project_documents")
      .insert({
        ...validated,
        project_id: Number(projectId),
        created_by: user.id,
        uploaded_by: validated.uploaded_by ?? user.email,
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
        { error: "Validation failed", details: error.format() },
        { status: 400 },
      );
    }
    return apiErrorResponse(error);
  }
}
