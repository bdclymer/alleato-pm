import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RouteParams {
  params: Promise<{ projectId: string; submittalId: string }>;
}

const deleteAttachmentsSchema = z.object({
  attachment_ids: z.array(z.string().uuid()).min(1),
});

/**
 * GET /api/projects/[projectId]/submittals/[submittalId]/attachments
 * Returns all submittal attachments.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/submittals/[submittalId]/attachments#GET",
  async ({ params }) => {
    const { projectId, submittalId } = await params;
    const supabase = await createClient();

    const { data: submittal, error: submittalError } = await supabase
      .from("submittals")
      .select("id")
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", submittalId)
      .is("deleted_at", null)
      .single();

    if (submittalError || !submittal) {
      return NextResponse.json({ error: "Submittal not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("submittal_attachments")
      .select(
        "id, file_name, file_url, file_size, content_type, is_current, uploaded_by, created_at",
      )
      .eq("submittal_id", submittalId)
      .order("created_at", { ascending: false });

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data ?? []);
  },
);

/**
 * POST /api/projects/[projectId]/submittals/[submittalId]/attachments
 * Uploads one attachment and creates a submittal_attachments record.
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/submittals/[submittalId]/attachments#POST",
  async ({ request, params }) => {
    const { projectId, submittalId } = await params;
    const supabase = await createClient();
    const service = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/submittals/[submittalId]/attachments#POST",
        message: "Authentication required.",
      });
    }

    const { data: submittal, error: submittalError } = await supabase
      .from("submittals")
      .select("id")
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", submittalId)
      .is("deleted_at", null)
      .single();

    if (submittalError || !submittal) {
      return NextResponse.json({ error: "Submittal not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = (formData.get("file") || formData.get("files")) as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const normalizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${projectId}/submittals/${submittalId}/${Date.now()}-${normalizedName}`;
    const fileBuffer = await file.arrayBuffer();
    const contentType = file.type?.trim() || "application/octet-stream";

    const { error: uploadError } = await service.storage
      .from("project-files")
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 400 },
      );
    }

    const {
      data: { publicUrl },
    } = service.storage.from("project-files").getPublicUrl(storagePath);

    const { data: attachment, error: insertError } = await supabase
      .from("submittal_attachments")
      .insert({
        submittal_id: submittalId,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        content_type: contentType,
        uploaded_by: user.id,
        is_current: true,
      })
      .select(
        "id, file_name, file_url, file_size, content_type, is_current, uploaded_by, created_at",
      )
      .single();

    if (insertError) {
      await service.storage.from("project-files").remove([storagePath]);
      return apiErrorResponse(insertError);
    }

    return NextResponse.json(attachment, { status: 201 });
  },
);

/**
 * DELETE /api/projects/[projectId]/submittals/[submittalId]/attachments
 * Deletes selected submittal attachments records.
 */
export const DELETE = withApiGuardrails(
  "projects/[projectId]/submittals/[submittalId]/attachments#DELETE",
  async ({ request, params }) => {
    const { projectId, submittalId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/submittals/[submittalId]/attachments#DELETE",
        message: "Authentication required.",
      });
    }

    const { data: submittal, error: submittalError } = await supabase
      .from("submittals")
      .select("id")
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", submittalId)
      .is("deleted_at", null)
      .single();

    if (submittalError || !submittal) {
      return NextResponse.json({ error: "Submittal not found" }, { status: 404 });
    }

    const body = await request.json();
    const { attachment_ids } = deleteAttachmentsSchema.parse(body);

    const { error } = await supabase
      .from("submittal_attachments")
      .delete()
      .eq("submittal_id", submittalId)
      .in("id", attachment_ids);

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ success: true, deleted_count: attachment_ids.length });
  },
);
