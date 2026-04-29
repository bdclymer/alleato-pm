import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions-guard";
import { renderPdfFromHtml, buildChangeEventHtml } from "@/lib/documents/pdf";
import { logger } from "@/lib/logger";

// Puppeteer requires the Node.js runtime — Edge runtime does not support it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escHtml(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const POST = withApiGuardrails(
  "projects/[projectId]/change-events/[changeEventId]/email#POST",
  async ({ request, params }) => {
    const { projectId, changeEventId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const guard = await requirePermission(projectIdNum, "change_orders", "write");
    if (guard.denied) return guard.response;

    const body = await request.json();
    const { recipients, subject, message } = body as {
      recipients: string[];
      subject: string;
      message?: string;
    };

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: "recipients is required" }, { status: 400 });
    }
    const invalidEmail = recipients.find((r) => !EMAIL_RE.test(r));
    if (invalidEmail) {
      return NextResponse.json(
        { error: `Invalid email address: ${invalidEmail}` },
        { status: 400 },
      );
    }
    if (!subject) {
      return NextResponse.json({ error: "subject is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: changeEvent, error: ceError } = await supabase
      .from("change_events")
      .select(
        `
        *,
        change_event_line_items(
          id,
          description,
          budget_code_id,
          quantity,
          unit_of_measure,
          unit_cost,
          revenue_rom,
          cost_rom,
          non_committed_cost,
          budget_line:budget_lines!change_event_line_items_budget_code_id_fkey(
            id,
            description,
            cost_code:cost_codes!cost_code_id(
              id,
              title,
              division_title
            )
          ),
          vendor:companies!vendor_id(id, name)
        )
      `,
      )
      .eq("project_id", projectIdNum)
      .eq("id", changeEventId)
      .is("deleted_at", null)
      .single();

    if (ceError || !changeEvent) {
      return NextResponse.json({ error: "Change event not found" }, { status: 404 });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id, name, project_number, address, state")
      .eq("id", projectIdNum)
      .single();

    let creator = null;
    if (changeEvent.created_by) {
      const { data: userAuth } = await supabase
        .from("users_auth")
        .select("person_id")
        .eq("auth_user_id", changeEvent.created_by)
        .single();
      if (userAuth?.person_id) {
        const { data: person } = await supabase
          .from("people")
          .select("id, email, first_name, last_name")
          .eq("id", userAuth.person_id)
          .single();
        creator = person;
      }
    }

    const lineItems = changeEvent.change_event_line_items || [];
    const mappedProject = project ? { ...project, number: project.project_number } : null;
    const htmlContent = buildChangeEventHtml({ ...changeEvent, creator }, lineItems, mappedProject);

    const ceNumber = changeEvent.number || changeEvent.id;

    let attachments: Array<{ filename: string; content: string }> = [];
    try {
      const pdfBuffer = await renderPdfFromHtml(htmlContent);
      attachments = [
        {
          filename: `change-event-${ceNumber}.pdf`,
          content: pdfBuffer.toString("base64"),
        },
      ];
    } catch (pdfError) {
      logger.error({ msg: "[change-events/email] PDF generation failed, sending without attachment", error: pdfError instanceof Error ? pdfError.message : String(pdfError) });
    }

    const messageHtml = message
      ? `<p style="font-family:Arial,sans-serif;font-size:14px;color:#333;white-space:pre-wrap;">${escHtml(message)}</p><br/>`
      : "";

    // Only mention the PDF attachment if one was actually generated.
    // On Vercel (Puppeteer unavailable), attachments stays [] — avoid lying to recipients.
    const pdfNote = attachments.length > 0
      ? `<p style="font-size:13px;color:#444;">Please find the change event details attached as a PDF.</p>`
      : `<p style="font-size:13px;color:#444;">The change event details are available in your Alleato project dashboard.</p>`;

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
        <div style="background:#2d2d2d;padding:16px 24px;">
          <h1 style="color:#fff;font-size:18px;margin:0;">Alleato Group</h1>
        </div>
        <div style="padding:24px;">
          <h2 style="font-size:16px;margin-bottom:8px;">Change Event #${escHtml(String(ceNumber))}: ${escHtml(changeEvent.title) || "Untitled"}</h2>
          <p style="color:#666;font-size:13px;margin-bottom:16px;">
            Project: ${escHtml(project?.name) || "Unknown Project"}${project?.project_number ? ` (${escHtml(String(project.project_number))})` : ""}
          </p>
          ${messageHtml}
          ${pdfNote}
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="font-size:11px;color:#999;">This email was sent from Alleato Group project management software.</p>
        </div>
      </div>
    `;

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error: sendError } = await resend.emails.send({
      from: "Alleato <noreply@alleato.group>",
      to: recipients,
      subject,
      html: emailHtml,
      attachments,
    });

    if (sendError) {
      logger.error({ msg: "[email/route] Resend error:", data: sendError });
      return NextResponse.json(
        { error: sendError.message || "Failed to send email" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, id: data?.id });
  },
);
