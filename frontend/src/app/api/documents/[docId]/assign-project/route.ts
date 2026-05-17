import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_FIELDS = new Set([
  "title",
  "type",
  "category",
  "source",
  "status",
  "project_id",
  "tags",
]);

export const PATCH = withApiGuardrails<{ docId: string }>(
  "documents/[docId]/assign-project#PATCH",
  async ({ request, params }) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "documents/[docId]/assign-project#PATCH", message: "Authentication required." });
  }

    const { docId } = await params;
    const body = await request.json();

    // Filter to only allowed fields.
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        updates[key] = value;
      }
    }

    if ("project_id" in updates) {
      const projectId = updates.project_id;
      if (projectId === null || projectId === "") {
        updates.project_id = null;
        updates.project = null;
      } else if (typeof projectId === "number" && Number.isInteger(projectId)) {
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .select("id, name")
          .eq("id", projectId)
          .single();

        if (projectError) {
          return apiErrorResponse(projectError);
        }

        if (!project) {
          return NextResponse.json(
            { error: "Selected project does not exist" },
            { status: 400 },
          );
        }

        updates.project_id = project.id;
        updates.project = project.name;
      } else {
        return NextResponse.json(
          { error: "project_id must be an integer or null" },
          { status: 400 },
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("document_metadata")
      .update(updates)
      .eq("id", docId);

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ success: true });
  },
);
