import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// GET → list emails sent for this invoice
// POST → log a sent email { to_recipients[], cc_recipients?[], subject, body, email_type }
export const GET = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/emails#GET",
  async ({ request }) => {
  
    const supabase = await createClient();
    const { invoiceId } = await context.params;
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
  async ({ request }) => {
  
    const supabase = await createClient();
    const { invoiceId } = await context.params;
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

    if (!Array.isArray(to_recipients) || to_recipients.length === 0) {
      return NextResponse.json(
        { error: "to_recipients (non-empty array) required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("subcontractor_invoice_emails")
      .insert({
        invoice_id: invoiceIdNum,
        sent_by_user_id: user.id,
        sent_by_email: user.email ?? null,
        to_recipients,
        cc_recipients: Array.isArray(cc_recipients) ? cc_recipients : [],
        subject: subject ?? null,
        body: emailBody ?? null,
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

    // Audit log for Change History tab
    await supabase.from("subcontractor_invoice_audit_log").insert({
      invoice_id: invoiceIdNum,
      actor_user_id: user.id,
      actor_email: user.email ?? null,
      event_type: "email.sent",
      new_value: {
        to: to_recipients,
        cc: cc_recipients ?? [],
        subject: subject ?? null,
        email_type: email_type ?? "invoice",
      },
    });

    return NextResponse.json({ data });
    },
);
