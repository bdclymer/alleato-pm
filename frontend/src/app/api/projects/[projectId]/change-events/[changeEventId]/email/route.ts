import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; changeEventId: string }>;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "0";
  return String(n);
}

function buildHtml(changeEvent: any, lineItems: any[], project: any): string {
  const companyName = "Alleato Group";
  const companyAddress = "2050 Meridian Blvd., Suite 300";
  const companyCityState = "Franklin, TN 37067";
  const companyPhone = "(615) 771-0024";

  const printedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const projectAddress = [project?.address, project?.city, project?.state]
    .filter(Boolean)
    .join(", ");

  const lineItemRows = lineItems
    .map((item: any) => {
      const budgetCode =
        item.budget_line?.cost_code?.title ||
        item.budget_line?.description ||
        "—";
      const vendor = item.vendor?.name || "—";
      const commitment = item.commitment?.contract_number || "—";
      const qty = fmtNum(item.quantity);
      const unitCost = fmt(item.unit_cost);
      const revenueRom = fmt(item.revenue_rom);
      const costRom = fmt(item.cost_rom);
      const nonCommitted = fmt(item.non_committed_cost);
      const latestPrice = fmt(item.revenue_rom || 0);
      const latestCost = fmt(item.cost_rom || 0);
      const overUnder = fmt((item.revenue_rom || 0) - (item.cost_rom || 0));
      return `
        <tr>
          <td>${budgetCode}</td>
          <td>${vendor} / ${commitment}</td>
          <td>${item.unit_of_measure || "—"}</td>
          <td>${qty}</td>
          <td>${unitCost}</td>
          <td>${revenueRom}</td>
          <td>${latestPrice}</td>
          <td>${qty}</td>
          <td>${unitCost}</td>
          <td>${costRom}</td>
          <td>${nonCommitted}</td>
          <td>${latestCost}</td>
          <td>${overUnder}</td>
          <td>—</td>
        </tr>`;
    })
    .join("");

  const totalRevenueRom = lineItems.reduce((s: number, li: any) => s + (li.revenue_rom || 0), 0);
  const totalCostRom = lineItems.reduce((s: number, li: any) => s + (li.cost_rom || 0), 0);
  const totalNonCommitted = lineItems.reduce((s: number, li: any) => s + (li.non_committed_cost || 0), 0);
  const totalOverUnder = totalRevenueRom - totalCostRom;

  const ceNumber = changeEvent.number || changeEvent.id;
  const ceTitle = changeEvent.title || "Untitled";
  const ceStatus = changeEvent.status || "Open";
  const ceType = changeEvent.type || "—";
  const ceOrigin = changeEvent.origin || "—";
  const ceScope = changeEvent.scope || "—";
  const ceReason = changeEvent.reason || "—";
  const ceDescription = changeEvent.description || "—";
  const createdAt = changeEvent.created_at
    ? new Date(changeEvent.created_at).toLocaleDateString("en-US")
    : "—";
  const createdBy = changeEvent.creator
    ? [changeEvent.creator.first_name, changeEvent.creator.last_name].filter(Boolean).join(" ") ||
      changeEvent.creator.email ||
      "—"
    : "—";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Change Event #${ceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #1a1a1a; background: #fff; }
    .page { padding: 20mm 15mm; min-height: 100vh; position: relative; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .header-left { font-size: 10px; line-height: 1.5; }
    .header-left .company-name { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
    .header-right { text-align: right; font-size: 10px; line-height: 1.5; }
    .header-right .project-name { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
    hr.divider { border: none; border-top: 2px solid #1a1a1a; margin-bottom: 16px; }
    .ce-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 20px; }
    .meta-row { display: flex; gap: 6px; }
    .meta-label { font-weight: 600; white-space: nowrap; min-width: 100px; }
    .meta-value { color: #333; }
    .section-heading { font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 8px; }
    th { background: #2d2d2d; color: #fff; padding: 4px 3px; text-align: center; font-weight: 600; border: 1px solid #444; white-space: nowrap; }
    th.group-revenue { background: #1a4d7a; }
    th.group-cost { background: #2d6b3d; }
    th.group-overunder { background: #6b3a2d; }
    th.group-budgetmod { background: #4a3d6b; }
    td { padding: 3px; border: 1px solid #ddd; text-align: center; vertical-align: top; }
    td:first-child { text-align: left; }
    td:nth-child(2) { text-align: left; }
    tr:nth-child(even) { background: #f8f8f8; }
    .totals-row { font-weight: 700; background: #f0f0f0 !important; }
    .totals-row td { border-top: 2px solid #333; }
    .footer { display: flex; justify-content: space-between; font-size: 8px; color: #666; border-top: 1px solid #ccc; padding-top: 4px; margin-top: 16px; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <div class="company-name">${companyName}</div>
      <div>${companyAddress}</div>
      <div>${companyCityState}</div>
      <div>${companyPhone}</div>
    </div>
    <div class="header-right">
      <div class="project-name">Project: ${project?.project_number ? `${project.number} - ` : ""}${project?.name || "Unknown Project"}</div>
      ${projectAddress ? `<div>${projectAddress}</div>` : ""}
    </div>
  </div>
  <hr class="divider" />
  <div class="ce-title">CHANGE EVENT #${ceNumber} &mdash; ${ceTitle}</div>
  <div class="meta-grid">
    <div>
      <div class="meta-row"><span class="meta-label">Origin:</span><span class="meta-value">${ceOrigin}</span></div>
      <div class="meta-row"><span class="meta-label">Date Created:</span><span class="meta-value">${createdAt}</span></div>
      <div class="meta-row"><span class="meta-label">Status:</span><span class="meta-value">${ceStatus}</span></div>
      <div class="meta-row"><span class="meta-label">Type:</span><span class="meta-value">${ceType}</span></div>
      <div class="meta-row"><span class="meta-label">Description:</span><span class="meta-value">${ceDescription}</span></div>
      <div class="meta-row"><span class="meta-label">Attachments:</span><span class="meta-value">—</span></div>
    </div>
    <div>
      <div class="meta-row"><span class="meta-label">Created By:</span><span class="meta-value">${createdBy}</span></div>
      <div class="meta-row"><span class="meta-label">Scope:</span><span class="meta-value">${ceScope}</span></div>
      <div class="meta-row"><span class="meta-label">Change Reason:</span><span class="meta-value">${ceReason}</span></div>
    </div>
  </div>
  <div class="section-heading">Change Event Line Items</div>
  <table>
    <thead>
      <tr>
        <th rowspan="2">Budget Code</th>
        <th rowspan="2">Vendor / Contract</th>
        <th rowspan="2">UOM</th>
        <th colspan="3" class="group-revenue">Revenue</th>
        <th colspan="1" class="group-revenue">Prime PCO</th>
        <th colspan="4" class="group-cost">Cost</th>
        <th colspan="1" class="group-overunder">Over/Under</th>
        <th colspan="1" class="group-budgetmod">Budget Mod.</th>
      </tr>
      <tr>
        <th class="group-revenue">QTY</th>
        <th class="group-revenue">Unit Cost</th>
        <th class="group-revenue">ROM</th>
        <th class="group-revenue">Latest Price</th>
        <th class="group-cost">QTY</th>
        <th class="group-cost">Unit Cost</th>
        <th class="group-cost">Non-Commit.</th>
        <th class="group-cost">Latest Cost</th>
        <th class="group-overunder">Over/Under</th>
        <th class="group-budgetmod">Budget Mod.</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemRows || `<tr><td colspan="14" style="text-align:center;padding:8px;color:#666;">No line items</td></tr>`}
      <tr class="totals-row">
        <td colspan="5"><strong>Grand Totals</strong></td>
        <td>${fmt(totalRevenueRom)}</td>
        <td>${fmt(totalRevenueRom)}</td>
        <td></td>
        <td></td>
        <td>${fmt(totalNonCommitted)}</td>
        <td>${fmt(totalCostRom)}</td>
        <td>${fmt(totalOverUnder)}</td>
        <td>—</td>
      </tr>
    </tbody>
  </table>
  <div class="footer">
    <span>${companyName}</span>
    <span>Page 1 of 1</span>
    <span>Printed on: ${printedOn}</span>
  </div>
</div>
</body>
</html>`;
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
    if (!subject) {
      return NextResponse.json({ error: "subject is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch change event
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
          budget_line:budget_lines!budget_code_id(
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
      `
      )
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", changeEventId)
      .is("deleted_at", null)
      .single();

    if (ceError || !changeEvent) {
      return NextResponse.json({ error: "Change event not found" }, { status: 404 });
    }

    // Fetch project info
    const { data: project } = await supabase
      .from("projects")
      .select("id, name, project_number, address, state")
      .eq("id", parseInt(projectId, 10))
      .single();

    // Resolve creator
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
    const htmlContent = buildHtml({ ...changeEvent, creator }, lineItems, project);

    // Generate PDF
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const browserPage = await browser.newPage();
    await browserPage.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await browserPage.pdf({
      format: "Letter",
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
      printBackground: true,
    });
    await browser.close();

    const ceNumber = changeEvent.number || changeEvent.id;
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    // Build email HTML body
    const messageHtml = message
      ? `<p style="font-family:Arial,sans-serif;font-size:14px;color:#333;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p><br/>`
      : "";

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
        <div style="background:#2d2d2d;padding:16px 24px;">
          <h1 style="color:#fff;font-size:18px;margin:0;">Alleato Group</h1>
        </div>
        <div style="padding:24px;">
          <h2 style="font-size:16px;margin-bottom:8px;">Change Event #${ceNumber}: ${changeEvent.title || "Untitled"}</h2>
          <p style="color:#666;font-size:13px;margin-bottom:16px;">
            Project: ${project?.name || "Unknown Project"}${project?.project_number ? ` (${project.project_number})` : ""}
          </p>
          ${messageHtml}
          <p style="font-size:13px;color:#444;">Please find the change event details attached as a PDF.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="font-size:11px;color:#999;">This email was sent from Alleato Group project management software.</p>
        </div>
      </div>
    `;

    // Send via Resend
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error: sendError } = await resend.emails.send({
      from: "Alleato <noreply@alleato.group>",
      to: recipients,
      subject,
      html: emailHtml,
      attachments: [
        {
          filename: `change-event-${ceNumber}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (sendError) {
      console.error("[email/route] Resend error:", sendError);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
    },
);
