import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { renderInvoicePdfBuffer } from "@/lib/invoice-pdf";
import { fetchInvoicePdfData } from "../pdf/route";
import { requirePermission } from "@/lib/permissions-guard";

// Node runtime required by @react-pdf/renderer
export const runtime = "nodejs";

interface EmailRequestBody {
  to: string[] | string;
  cc?: string[] | string;
  subject?: string;
  message?: string;
}

function normalizeEmails(value: string[] | string | undefined): string[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : value.split(",");
  return arr
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

function getFromAddress(): string {
  const configured =
    process.env.RESEND_FROM_EMAIL || process.env.DIGEST_FROM_EMAIL;
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") {
    return "Alleato <onboarding@resend.dev>";
  }
  throw new Error(
    "RESEND_FROM_EMAIL must be configured with a verified sender address",
  );
}

export const POST = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/owner/[invoiceId]/email#POST",
  async ({ request }) => {
  
    const { projectId, invoiceId } = await context.params;
    const projectIdNum = parseInt(projectId, 10);

    const guard = await requirePermission(projectIdNum, "contracts", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();

    const body = (await request.json()) as EmailRequestBody;
    const toList = normalizeEmails(body.to);
    const ccList = normalizeEmails(body.cc);

    if (toList.length === 0) {
      return NextResponse.json(
        { error: "At least one valid recipient is required in 'to'" },
        { status: 400 },
      );
    }

    const invoiceIdNum = parseInt(invoiceId, 10);

    const data = await fetchInvoicePdfData(
      supabase,
      projectIdNum,
      invoiceIdNum,
    );
    if (!data) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const invoiceNumber = data.invoice_number || `INV-${data.id}`;
    const subject = body.subject?.trim() || `Invoice #${invoiceNumber}`;
    const message =
      body.message?.trim() ||
      `Please find attached invoice #${invoiceNumber}.`;

    // Generate PDF
    const pdfBuffer = await renderInvoicePdfBuffer(data);
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    // Compose email HTML
    const safeMessage = message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
        <div style="background:#2d2d2d;padding:16px 24px;">
          <h1 style="color:#fff;font-size:18px;margin:0;">Alleato Group</h1>
        </div>
        <div style="padding:24px;">
          <h2 style="font-size:16px;margin-bottom:8px;">Invoice #${invoiceNumber}</h2>
          <p style="color:#666;font-size:13px;margin-bottom:16px;">
            Project: ${data.project?.name || "Unknown Project"}${data.project?.number ? ` (${data.project.number})` : ""}
          </p>
          <p style="font-family:Arial,sans-serif;font-size:14px;color:#333;white-space:pre-wrap;">${safeMessage}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="font-size:11px;color:#999;">This email was sent from Alleato Group project management software.</p>
        </div>
      </div>
    `;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Email service not configured (missing RESEND_API_KEY)" },
        { status: 500 },
      );
    }

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: getFromAddress(),
      to: toList,
      cc: ccList.length > 0 ? ccList : undefined,
      subject,
      html: emailHtml,
      attachments: [
        {
          filename: `invoice-${invoiceNumber}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (sendError) {
      console.error("[invoice email] Resend error:", sendError);
      return NextResponse.json(
        { error: "Failed to send email", details: sendError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, id: sendResult?.id });
    },
);
