import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string; attachmentId: string }>;
}

/**
 * DELETE /api/projects/[projectId]/contracts/[contractId]/attachments/[attachmentId]
 * Deletes an attachment from a prime contract
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { contractId, attachmentId } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the attachment to get its storage path before deleting
    const { data: attachment, error: fetchError } = await serviceClient
      .from("attachments")
      .select("id, url, attached_to_id")
      .eq("id", attachmentId)
      .eq("attached_to_id", contractId)
      .eq("attached_to_table", "prime_contracts")
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Delete DB record first
    const { error: deleteError } = await serviceClient
      .from("attachments")
      .delete()
      .eq("id", attachmentId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete attachment", details: deleteError.message },
        { status: 400 },
      );
    }

    // Best-effort: remove from storage (derive path from public URL)
    if (attachment.url) {
      try {
        const url = new URL(attachment.url);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/project-files\/(.+)/);
        if (pathMatch?.[1]) {
          await serviceClient.storage
            .from("project-files")
            .remove([decodeURIComponent(pathMatch[1])]);
        }
      } catch {
        // Storage deletion failure is non-fatal — DB record is already gone
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
