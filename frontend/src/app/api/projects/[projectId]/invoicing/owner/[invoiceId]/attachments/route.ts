import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[projectId]/invoicing/owner/[invoiceId]/attachments
 * Returns all attachments for an owner invoice, with signed download URLs.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/invoicing/owner/[invoiceId]/attachments#GET",
  async ({ params }) => {
    const { projectId, invoiceId } = params as { projectId: string; invoiceId: string };
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/invoicing/owner/[invoiceId]/attachments#GET",
        message: "Authentication required.",
      });
    }

    // Verify the invoice belongs to the project
    const { data: invoice, error: invoiceError } = await supabase
      .from("owner_invoices")
      .select("id")
      .eq("id", Number(invoiceId))
      .eq("project_id", Number(projectId))
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const { data: attachments, error } = await supabase
      .from("invoice_attachments")
      .select("*")
      .eq("owner_invoice_id", Number(invoiceId))
      .order("created_at", { ascending: false });

    if (error) {
      return apiErrorResponse(error);
    }

    const rows = attachments ?? [];

    // Generate signed download URLs for all attachments in one batch call
    const signedUrls: Record<string, string> = {};
    if (rows.length > 0) {
      const { data: signed } = await supabase.storage
        .from("project-files")
        .createSignedUrls(
          rows.map((a) => a.file_path),
          60 * 60,
        );
      if (signed) {
        for (const entry of signed) {
          if (entry.signedUrl) {
            signedUrls[entry.path] = entry.signedUrl;
          }
        }
      }
    }

    const formatted = rows.map((a) => ({
      id: a.id,
      fileName: a.file_name,
      filePath: a.file_path,
      fileSize: a.file_size,
      mimeType: a.mime_type,
      createdAt: a.created_at,
      downloadUrl: signedUrls[a.file_path] ?? null,
    }));

    return NextResponse.json({ data: formatted });
  },
);

/**
 * POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/attachments
 * Upload an attachment to an owner invoice.
 * Accepts multipart/form-data with a "file" field.
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/invoicing/owner/[invoiceId]/attachments#POST",
  async ({ request, params }) => {
    const { projectId, invoiceId } = params as { projectId: string; invoiceId: string };
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/invoicing/owner/[invoiceId]/attachments#POST",
        message: "Authentication required.",
      });
    }

    // Verify the invoice belongs to the project
    const { data: invoice, error: invoiceError } = await supabase
      .from("owner_invoices")
      .select("id")
      .eq("id", Number(invoiceId))
      .eq("project_id", Number(projectId))
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = (formData.get("file") ?? formData.get("files")) as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `${projectId}/invoice-attachments/${invoiceId}/${fileName}`;

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
      .from("invoice_attachments")
      .insert({
        owner_invoice_id: Number(invoiceId),
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      // Best-effort cleanup of the uploaded file
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
        createdAt: attachment.created_at,
      },
      { status: 201 },
    );
  },
);
