import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * DELETE /api/projects/[projectId]/invoicing/owner/[invoiceId]/attachments/[attachmentId]
 * Delete a single owner invoice attachment.
 */
export const DELETE = withApiGuardrails(
  "projects/[projectId]/invoicing/owner/[invoiceId]/attachments/[attachmentId]#DELETE",
  async ({ params }) => {
    const { projectId, invoiceId, attachmentId } = params as {
      projectId: string;
      invoiceId: string;
      attachmentId: string;
    };
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/invoicing/owner/[invoiceId]/attachments/[attachmentId]#DELETE",
        message: "Authentication required.",
      });
    }

    // Verify the invoice belongs to the project before allowing deletion
    const { data: invoice, error: invoiceError } = await supabase
      .from("owner_invoices")
      .select("id")
      .eq("id", Number(invoiceId))
      .eq("project_id", Number(projectId))
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const { data: attachment, error: fetchError } = await supabase
      .from("invoice_attachments")
      .select("id, file_path")
      .eq("id", Number(attachmentId))
      .eq("owner_invoice_id", Number(invoiceId))
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("invoice_attachments")
      .delete()
      .eq("id", Number(attachmentId))
      .eq("owner_invoice_id", Number(invoiceId));

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete attachment", details: deleteError.message },
        { status: 400 },
      );
    }

    // Best-effort storage cleanup
    const { error: storageError } = await supabase.storage
      .from("project-files")
      .remove([attachment.file_path]);

    if (storageError) {
      logger.error({
        msg: "Storage cleanup failed for invoice attachment",
        data: storageError.message,
      });
    }

    return NextResponse.json({ message: "Attachment deleted successfully" });
  },
);

/**
 * GET /api/projects/[projectId]/invoicing/owner/[invoiceId]/attachments/[attachmentId]
 * Returns a short-lived signed download URL for a single attachment.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/invoicing/owner/[invoiceId]/attachments/[attachmentId]#GET",
  async ({ params }) => {
    const { projectId, invoiceId, attachmentId } = params as {
      projectId: string;
      invoiceId: string;
      attachmentId: string;
    };
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/invoicing/owner/[invoiceId]/attachments/[attachmentId]#GET",
        message: "Authentication required.",
      });
    }

    // Verify invoice ownership
    const { data: invoice, error: invoiceError } = await supabase
      .from("owner_invoices")
      .select("id")
      .eq("id", Number(invoiceId))
      .eq("project_id", Number(projectId))
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const { data: attachment, error: fetchError } = await supabase
      .from("invoice_attachments")
      .select("id, file_name, file_path")
      .eq("id", Number(attachmentId))
      .eq("owner_invoice_id", Number(invoiceId))
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const { data: signedUrl, error: signError } = await supabase.storage
      .from("project-files")
      .createSignedUrl(attachment.file_path, 60 * 60);

    if (signError || !signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: signedUrl.signedUrl, fileName: attachment.file_name });
  },
);
