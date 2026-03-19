import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ projectId: string; primeCoId: string; attachmentId: string }>;
}

/**
 * DELETE /api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments/[attachmentId]
 * Delete a single PCCO attachment
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { attachmentId } = await params;
    const supabase = await createClient();

    // Fetch the attachment row
    const { data: attachment, error: fetchError } = await supabase
      .from("pcco_attachments")
      .select("id, file_path")
      .eq("id", attachmentId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 },
      );
    }

    // Delete from storage
    await supabase.storage.from("project-files").remove([attachment.file_path]);

    // Delete DB row
    const { error: deleteError } = await supabase
      .from("pcco_attachments")
      .delete()
      .eq("id", attachmentId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete attachment", details: deleteError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Attachment deleted successfully" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
