import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; commitmentCoId: string; attachmentId: string }>;
}

/**
 * DELETE /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/attachments/[attachmentId]
 * Delete a single CCO attachment
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentCoId, attachmentId } = await params;
    const supabase = await createClient();

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the CCO belongs to this project via its commitment
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

    // Fetch the attachment row — scoped to the parent CCO to prevent cross-CO deletion
    const { data: attachment, error: fetchError } = await supabase
      .from("cco_attachments")
      .select("id, file_path")
      .eq("id", attachmentId)
      .eq("cco_id", commitmentCoId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 },
      );
    }

    // Delete DB row first; storage removal is best-effort cleanup
    const { error: deleteError } = await supabase
      .from("cco_attachments")
      .delete()
      .eq("id", attachmentId)
      .eq("cco_id", commitmentCoId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete attachment", details: deleteError.message },
        { status: 400 },
      );
    }

    // Remove from storage (best-effort — log errors but don't fail the request)
    const { error: storageError } = await supabase.storage
      .from("project-files")
      .remove([attachment.file_path]);

    if (storageError) {
      console.error("Storage cleanup failed for CCO attachment:", storageError.message);
    }

    return NextResponse.json({ message: "Attachment deleted successfully" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
