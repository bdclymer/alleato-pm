import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; commitmentCoId: string }>;
}

/**
 * GET /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/attachments
 * Returns all attachments for a CCO
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/commitment-change-orders/[commitmentCoId]/attachments#GET",
  async ({ request, params }) => {
  
    const { projectId, commitmentCoId } = await params;
    const supabase = await createClient();

    // Authenticate caller
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/commitment-change-orders/[commitmentCoId]/attachments#GET", message: "Authentication required." });
    }

    // Verify the CCO exists and belongs to this project via its commitment
    const { data: cco, error: ccoError } = await supabase
      .from("contract_change_orders")
      .select("id, contract_id")
      .eq("id", commitmentCoId)
      .single();

    if (ccoError || !cco) {
      return NextResponse.json({ error: "Change order not found" }, { status: 404 });
    }

    const { data: commitment } = await supabase
      .from("commitments_unified")
      .select("id, project_id")
      .eq("id", cco.contract_id)
      .is("deleted_at", null)
      .single();

    if (!commitment || commitment.project_id !== Number(projectId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: attachments, error } = await supabase
      .from("cco_attachments")
      .select("*")
      .eq("cco_id", commitmentCoId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return apiErrorResponse(error);
    }

    const formatted = (attachments || []).map((a) => ({
      id: a.id,
      fileName: a.file_name,
      filePath: a.file_path,
      fileSize: a.file_size,
      mimeType: a.mime_type,
      uploadedAt: a.uploaded_at,
    }));

    return NextResponse.json({ data: formatted });
    },
);

/**
 * POST /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/attachments
 * Upload an attachment to a CCO
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/commitment-change-orders/[commitmentCoId]/attachments#POST",
  async ({ request, params }) => {
  
    const { projectId, commitmentCoId } = await params;
    const projectIdNum = Number(projectId);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/commitment-change-orders/[commitmentCoId]/attachments#POST", message: "Authentication required." });
    }

    const guard = await requirePermission(projectIdNum, "contracts", "write");
    if (guard.denied) return guard.response;

    // Verify the parent CCO exists and belongs to this project (via its contract)
    const { data: cco, error: ccoError } = await supabase
      .from("contract_change_orders")
      .select("id, contract_id")
      .eq("id", commitmentCoId)
      .single();

    if (ccoError || !cco) {
      return NextResponse.json({ error: "Change order not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = (formData.get("file") || formData.get("files")) as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `${projectId}/cco-attachments/${commitmentCoId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("project-files")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 400 },
      );
    }

    const { data: attachment, error: dbError } = await supabase
      .from("cco_attachments")
      .insert({
        cco_id: commitmentCoId,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      await supabase.storage.from("project-files").remove([storagePath]);
      return NextResponse.json(
        { error: "Failed to create attachment record", details: dbError.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        id: attachment.id,
        fileName: attachment.file_name,
        filePath: attachment.file_path,
        fileSize: attachment.file_size,
        mimeType: attachment.mime_type,
        uploadedAt: attachment.uploaded_at,
      },
      { status: 201 },
    );
    },
);
