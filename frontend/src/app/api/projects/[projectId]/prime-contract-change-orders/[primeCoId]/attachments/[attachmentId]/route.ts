import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string; primeCoId: string; attachmentId: string }>;
}

/**
 * DELETE /api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments/[attachmentId]
 * Delete a single PCCO attachment
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { primeCoId, attachmentId } = await params;
    const supabase = await createClient();

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the attachment row — scoped to the parent PCCO to prevent cross-CO deletion
    const { data: attachment, error: fetchError } = await supabase
      .from("pcco_attachments")
      .select("id, file_path")
      .eq("id", attachmentId)
      .eq("pcco_id", Number(primeCoId))
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 },
      );
    }

    // Delete DB row first; storage removal is best-effort cleanup
    const { error: deleteError } = await supabase
      .from("pcco_attachments")
      .delete()
      .eq("id", attachmentId)
      .eq("pcco_id", Number(primeCoId));

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
      console.error("Storage cleanup failed for PCCO attachment:", storageError.message);
    }

    return NextResponse.json({ message: "Attachment deleted successfully" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
