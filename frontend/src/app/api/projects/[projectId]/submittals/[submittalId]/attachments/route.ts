import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requirePermission } from "@/lib/permissions-guard";

/**
 * POST /api/projects/[projectId]/submittals/[submittalId]/attachments
 * Uploads a single file and creates a submittal_attachments record.
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/submittals/[submittalId]/attachments#POST",
  async ({ request, params }) => {
    const { projectId, submittalId } = await params;
    const projectIdNum = Number.parseInt(projectId, 10);
    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const guard = await requirePermission(projectIdNum, "submittals", "write");
    if (guard.denied) return guard.response;

    // Sensitive: auth check + storage write + DB write for project attachments.
    const supabase = await createClient();
    const serviceClient = createServiceClient();

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

    // Validate that the submittal exists in this project before writing files/rows.
    const { data: submittal, error: submittalError } = await serviceClient
      .from("submittals")
      .select("id")
      .eq("project_id", projectIdNum)
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

    const sanitizedFileName = file.name?.trim();
    if (!sanitizedFileName) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }

    const extension = sanitizedFileName.includes(".")
      ? sanitizedFileName.split(".").pop()
      : "bin";
    const storageFileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;
    const storagePath = `${projectId}/submittals/${submittalId}/attachments/${storageFileName}`;
    const contentType = file.type?.trim() || "application/octet-stream";

    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await serviceClient.storage
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
    } = serviceClient.storage.from("project-files").getPublicUrl(storagePath);

    const { data: attachment, error: insertError } = await serviceClient
      .from("submittal_attachments")
      .insert({
        submittal_id: submittalId,
        file_name: sanitizedFileName,
        file_url: publicUrl,
        file_size: file.size,
        content_type: contentType,
        is_current: true,
        uploaded_by: user.id,
      })
      .select(
        "id, file_name, file_url, file_size, content_type, is_current, uploaded_by, created_at",
      )
      .single();

    if (insertError || !attachment) {
      await serviceClient.storage.from("project-files").remove([storagePath]);
      if (insertError) {
        return apiErrorResponse(insertError);
      }
      return NextResponse.json(
        { error: "Failed to create attachment record" },
        { status: 500 },
      );
    }

    return NextResponse.json(attachment, { status: 201 });
  },
);
