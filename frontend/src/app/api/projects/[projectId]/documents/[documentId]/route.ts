import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; documentId: string }>;
}

const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  folder: z.string().nullable().optional(),
  file_name: z.string().min(1).optional(),
  file_url: z.string().min(1).optional(),
  file_size: z.number().nullable().optional(),
  content_type: z.string().nullable().optional(),
  version: z.number().nullable().optional(),
  status: z.enum(["Draft", "Published", "Superseded", "Archived"]).optional(),
  category: z.string().nullable().optional(),
  is_private: z.boolean().nullable().optional(),
  reviewed_by: z.string().nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
});

// =============================================================================
// GET - Fetch a single document
// =============================================================================

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, documentId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("project_documents")
      .select("*")
      .eq("id", Number(documentId))
      .eq("project_id", Number(projectId))
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// =============================================================================
// PUT - Update a document
// =============================================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, documentId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateDocumentSchema.parse(body);

    const { data, error } = await supabase
      .from("project_documents")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", Number(documentId))
      .eq("project_id", Number(projectId))
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
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

// =============================================================================
// DELETE - Soft delete a document
// =============================================================================

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, documentId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("project_documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", Number(documentId))
      .eq("project_id", Number(projectId))
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      return apiErrorResponse(error);
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
