import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string; attachmentId: string }>;
}

/**
 * DELETE /api/projects/[projectId]/contracts/[contractId]/attachments/[attachmentId]
 * Deletes an attachment from a prime contract
 */
export const DELETE = withApiGuardrails(
  "projects/[projectId]/contracts/[contractId]/attachments/[attachmentId]#DELETE",
  async ({ request, params }) => {
  
    const { projectId, contractId, attachmentId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const guard = await requirePermission(projectIdNum, "contracts", "admin");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/contracts/[contractId]/attachments/[attachmentId]#DELETE", message: "Authentication required." });
    }

    const { data: link, error: linkError } = await serviceClient
      .from("prime_contract_attachments")
      .select("attachment_id")
      .eq("contract_id", contractId)
      .eq("attachment_id", attachmentId)
      .single();

    let attachment: { id: string; url: string | null } | null = null;

    if (!linkError && link) {
      const { data: mappedAttachment, error: mappedAttachmentError } = await serviceClient
        .from("attachments")
        .select("id, url")
        .eq("id", link.attachment_id)
        .single();
      if (!mappedAttachmentError && mappedAttachment) {
        attachment = mappedAttachment;
      }
    }

    if (!attachment) {
      // Temporary fallback while environments are being migrated.
      const { data: legacyAttachment, error: legacyFetchError } = await serviceClient
        .from("attachments")
        .select("id, url")
        .eq("id", attachmentId)
        .eq("attached_to_id", contractId)
        .eq("attached_to_table", "prime_contracts")
        .single();

      if (legacyFetchError || !legacyAttachment) {
        return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
      }

      attachment = legacyAttachment;
    }

    // Delete DB record first
    const { error: deleteError } = await serviceClient
      .from("attachments")
      .delete()
      .eq("id", attachment.id);

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
    },
);
