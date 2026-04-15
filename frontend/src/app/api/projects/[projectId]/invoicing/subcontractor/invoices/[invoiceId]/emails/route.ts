import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { sendDocumentEmail } from "@/lib/documents/email";
import { fetchSubcontractorInvoicePdfData } from "../pdf/route";
import { renderSubcontractorInvoicePdfBuffer } from "@/lib/subcontractor-invoice-pdf";

// GET → list emails sent for this invoice
// POST → log a sent email { to_recipients[], cc_recipients?[], subject, body, email_type }
export const GET = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/emails#GET",
  async ({ request, params }) => {
  
    const supabase = await createClient();
    const { invoiceId } = params;
    const invoiceIdNum = parseInt(invoiceId, 10);

    const { data, error } = await supabase
      .from("subcontractor_invoice_emails")
      .select("*")
      .eq("invoice_id", invoiceIdNum)
      .order("sent_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch emails", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: data ?? [] });
    },
);

export const POST = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/emails#POST",
  async ({ request, params }) => {
  
    const supabase = await createClient();
    const { invoiceId } = params;
    const invoiceIdNum = parseInt(invoiceId, 10);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/emails#POST", message: "Authentication required." });

    const body = await request.json().catch(() => ({}));
    const {
      to_recipients,
      cc_recipients,
      subject,
      body: emailBody,
      email_type,
    } = body ?? {};

    // Normalizes and validates recipient email lists.
    const normalizeEmails = (value: unknown): string[] =>
      Array.isArray(value)
        ? value
            .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
            .filter((entry) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry))
        : [];

    const toRecipients = normalizeEmails(to_recipients);
    const ccRecipients = normalizeEmails(cc_recipients);

    if (toRecipients.length === 0) {
      return NextResponse.json(
        { error: "to_recipients (non-empty array) required" },
        { status: 400 },
      );
    }

    const projectIdNum = Number.parseInt(params.projectId, 10);
    if (!Number.isFinite(projectIdNum)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const invoiceResult = await fetchSubcontractorInvoicePdfData(
      supabase,
      projectIdNum,
      invoiceIdNum,
    );

    if (invoiceResult.error || !invoiceResult.data) {
      return apiErrorResponse(
        invoiceResult.error ?? { message: "Invoice not found." },
      );
    }

    const invoiceData = invoiceResult.data;
    const invoiceNumber =
      invoiceData.invoice_number || `APP-${invoiceData.application_number}`;
    const resolvedSubject =
      typeof subject === "string" && subject.trim().length > 0
        ? subject.trim()
        : `Invoice ${invoiceNumber}`;
    const resolvedBody =
      typeof emailBody === "string" && emailBody.trim().length > 0
        ? emailBody.trim()
        : `Please find attached invoice ${invoiceNumber}.`;

    const pdfBuffer = await renderSubcontractorInvoicePdfBuffer(invoiceData);
    const safeMessage = resolvedBody
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");

    // Sensitive: sends external email with attached financial document.
    try {
      await sendDocumentEmail({
        to: toRecipients,
        subject: resolvedSubject,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111827;">
            <h2 style="margin:0 0 8px 0;">Invoice ${invoiceNumber}</h2>
            <p style="margin:0 0 16px 0;color:#4b5563;">
              ${invoiceData.project_name ?? "Project"}
              ${invoiceData.project_number ? ` (${invoiceData.project_number})` : ""}
            </p>
            <p style="white-space:pre-wrap;line-height:1.5;">${safeMessage}</p>
          </div>
        `,
        text: resolvedBody,
        attachments: [
          {
            filename: `subcontract-invoice-${invoiceNumber}.pdf`,
            content: Buffer.from(pdfBuffer).toString("base64"),
          },
        ],
      });
    } catch (error) {
      // Sensitive: persists failed sends so operations can diagnose delivery issues.
      await supabase.from("subcontractor_invoice_emails").insert({
        invoice_id: invoiceIdNum,
        sent_by_user_id: user.id,
        sent_by_email: user.email ?? null,
        to_recipients: toRecipients,
        cc_recipients: ccRecipients,
        subject: resolvedSubject,
        body: resolvedBody,
        email_type: email_type ?? "invoice",
        status: "failed",
      });

      const message =
        error instanceof Error ? error.message : "Failed to send invoice email";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    // Sensitive: persists outbound email event for audit/history.
    const { data, error } = await supabase
      .from("subcontractor_invoice_emails")
      .insert({
        invoice_id: invoiceIdNum,
        sent_by_user_id: user.id,
        sent_by_email: user.email ?? null,
        to_recipients: toRecipients,
        cc_recipients: ccRecipients,
        subject: resolvedSubject,
        body: resolvedBody,
        email_type: email_type ?? "invoice",
        status: "sent",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to log email", details: error.message },
        { status: 500 },
      );
    }

    // Sensitive: writes invoice audit trail for compliance and traceability.
    await supabase.from("subcontractor_invoice_audit_log").insert({
      invoice_id: invoiceIdNum,
      actor_user_id: user.id,
      actor_email: user.email ?? null,
      event_type: "email.sent",
      new_value: {
        to: toRecipients,
        cc: ccRecipients,
        subject: resolvedSubject,
        email_type: email_type ?? "invoice",
      },
    });

    return NextResponse.json({ data });
    },
);
