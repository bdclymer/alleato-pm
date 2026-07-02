import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions-guard";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { listLinkedPatternCDocuments } from "@/lib/documents/pattern-c-attachments";
import { renderPdfFromHtml } from "@/lib/documents/pdf";
import {
  buildBrandedDocumentHtml,
  buildBrandedFooterTemplate,
  BRANDED_FOOTER_MARGIN,
} from "@/lib/documents/branded-letterhead";

// Puppeteer requires the Node.js runtime — Edge runtime does not support it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US");
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-US");
}

/**
 * GET /api/projects/[projectId]/submittals/[submittalId]/pdf
 * Renders a branded submittal "cover sheet" PDF: submittal info, review
 * workflow steps, distribution list, linked drawings, attachments, and
 * status history.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/submittals/[submittalId]/pdf#GET",
  async ({ params }) => {
    const { projectId, submittalId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const guard = await requirePermission(projectIdNum, "submittals", "read");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: submittal, error } = await supabase
      .from("submittals")
      .select(
        `*,
         submittal_type:submittal_types(id, name),
         submittal_package:submittal_packages(id, name),
         submittal_workflow_steps(
           id, step_order, step_type,
           submittal_responses(id, responder_id, response_status, comments, responded_at)
         ),
         submittal_distributions(
           id, from_id, message, distributed_at,
           submittal_distribution_recipients(id, recipient_id)
         ),
         submittal_linked_drawings(
           id, drawing_id,
           drawings!submittal_linked_drawings_drawing_id_fkey(drawing_number, title, discipline)
         ),
         submittal_history(id, action, actor_id, new_status, occurred_at)
        `,
      )
      .eq("project_id", projectIdNum)
      .eq("id", submittalId)
      .is("deleted_at", null)
      .single();

    if (error || !submittal) {
      throw new GuardrailError({ code: "NOT_FOUND", where: "GET /api/projects/[projectId]/submittals/[submittalId]/pdf", message: "Submittal not found", cause: error });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("name, project_number")
      .eq("id", projectIdNum)
      .single();

    // --- Batch-resolve display names for every referenced auth user id ---
    const workflowSteps = submittal.submittal_workflow_steps ?? [];
    const distributions = submittal.submittal_distributions ?? [];
    const history = submittal.submittal_history ?? [];
    const linkedDrawings = submittal.submittal_linked_drawings ?? [];

    const authUserIds = new Set<string>();
    for (const step of workflowSteps) {
      for (const response of step.submittal_responses ?? []) {
        if (response.responder_id) authUserIds.add(response.responder_id);
      }
    }
    for (const dist of distributions) {
      if (dist.from_id) authUserIds.add(dist.from_id);
      for (const recipient of dist.submittal_distribution_recipients ?? []) {
        if (recipient.recipient_id) authUserIds.add(recipient.recipient_id);
      }
    }
    for (const entry of history) {
      if (entry.actor_id) authUserIds.add(entry.actor_id);
    }
    if (submittal.received_from_id) authUserIds.add(submittal.received_from_id);
    if (submittal.submittal_manager_id) authUserIds.add(submittal.submittal_manager_id);

    const nameById = new Map<string, string>();
    if (authUserIds.size > 0) {
      const { data: authRows } = await supabase
        .from("users_auth")
        .select("auth_user_id, person:people!users_auth_person_id_fkey(first_name, last_name, email)")
        .in("auth_user_id", Array.from(authUserIds));
      for (const row of authRows ?? []) {
        const person = row.person as { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
        const name = [person?.first_name, person?.last_name].filter(Boolean).join(" ") || person?.email || null;
        if (row.auth_user_id && name) nameById.set(row.auth_user_id, name);
      }
    }

    function resolveName(id: string | null | undefined): string {
      if (!id) return "—";
      return nameById.get(id) || "—";
    }

    // --- Attachments ---
    const attachments = await listLinkedPatternCDocuments({
      supabase,
      serviceClient,
      entityType: "submittal",
      entityId: submittalId,
    });

    // --- Build HTML sections ---
    const metaGrid = `
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:11px;">
        <tr>
          <td style="width:25%;padding:4px 8px 4px 0;color:#6b6762;font-weight:700;">Status</td>
          <td style="width:25%;padding:4px 8px;">${esc(submittal.status)}</td>
          <td style="width:25%;padding:4px 8px 4px 0;color:#6b6762;font-weight:700;">Ball In Court</td>
          <td style="width:25%;padding:4px 8px;">${esc(submittal.ball_in_court)}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px 4px 0;color:#6b6762;font-weight:700;">Type</td>
          <td style="padding:4px 8px;">${esc(submittal.submittal_type?.name)}</td>
          <td style="padding:4px 8px 4px 0;color:#6b6762;font-weight:700;">Package</td>
          <td style="padding:4px 8px;">${esc(submittal.submittal_package?.name)}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px 4px 0;color:#6b6762;font-weight:700;">Spec Section</td>
          <td style="padding:4px 8px;">${esc(submittal.specification_section)}</td>
          <td style="padding:4px 8px 4px 0;color:#6b6762;font-weight:700;">Division</td>
          <td style="padding:4px 8px;">${esc(submittal.division)}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px 4px 0;color:#6b6762;font-weight:700;">Received From</td>
          <td style="padding:4px 8px;">${resolveName(submittal.received_from_id)}</td>
          <td style="padding:4px 8px 4px 0;color:#6b6762;font-weight:700;">Submittal Manager</td>
          <td style="padding:4px 8px;">${resolveName(submittal.submittal_manager_id)}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px 4px 0;color:#6b6762;font-weight:700;">Sent Date</td>
          <td style="padding:4px 8px;">${formatDate(submittal.sent_date)}</td>
          <td style="padding:4px 8px 4px 0;color:#6b6762;font-weight:700;">Final Due Date</td>
          <td style="padding:4px 8px;">${formatDate(submittal.final_due_date)}</td>
        </tr>
      </table>
      ${
        submittal.description
          ? `<div style="margin-bottom:18px;"><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b6762;margin-bottom:4px;">Description</div><div style="font-size:11px;">${esc(submittal.description)}</div></div>`
          : ""
      }
    `;

    function sectionHeading(label: string): string {
      return `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#242424;border-bottom:1px solid #ece7e2;padding-bottom:4px;margin:20px 0 8px;">${esc(label)}</div>`;
    }

    const workflowRows = workflowSteps
      .sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0))
      .map((step) => {
        const responses = step.submittal_responses ?? [];
        if (responses.length === 0) {
          return `<tr><td style="padding:4px 6px;border:1px solid #e2ddd7;">${step.step_order ?? "—"}</td><td style="padding:4px 6px;border:1px solid #e2ddd7;">${esc(step.step_type)}</td><td style="padding:4px 6px;border:1px solid #e2ddd7;" colspan="3">No response recorded</td></tr>`;
        }
        return responses
          .map(
            (r) => `<tr>
              <td style="padding:4px 6px;border:1px solid #e2ddd7;">${step.step_order ?? "—"}</td>
              <td style="padding:4px 6px;border:1px solid #e2ddd7;">${esc(step.step_type)}</td>
              <td style="padding:4px 6px;border:1px solid #e2ddd7;">${resolveName(r.responder_id)}</td>
              <td style="padding:4px 6px;border:1px solid #e2ddd7;">${esc(r.response_status)}</td>
              <td style="padding:4px 6px;border:1px solid #e2ddd7;">${formatDate(r.responded_at)}</td>
            </tr>`,
          )
          .join("");
      })
      .join("");

    const workflowSection = workflowSteps.length
      ? `${sectionHeading("Review Workflow")}
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <thead><tr style="background:#f3f1ee;">
            <th style="padding:4px 6px;border:1px solid #e2ddd7;text-align:left;">Step</th>
            <th style="padding:4px 6px;border:1px solid #e2ddd7;text-align:left;">Type</th>
            <th style="padding:4px 6px;border:1px solid #e2ddd7;text-align:left;">Responder</th>
            <th style="padding:4px 6px;border:1px solid #e2ddd7;text-align:left;">Status</th>
            <th style="padding:4px 6px;border:1px solid #e2ddd7;text-align:left;">Responded</th>
          </tr></thead>
          <tbody>${workflowRows}</tbody>
        </table>`
      : "";

    const distributionSection = distributions.length
      ? `${sectionHeading("Distribution")}
        ${distributions
          .map((dist) => {
            const recipients = (dist.submittal_distribution_recipients ?? [])
              .map((r) => resolveName(r.recipient_id))
              .join(", ");
            return `<div style="font-size:10px;margin-bottom:8px;">
              <div><strong>From:</strong> ${resolveName(dist.from_id)} &middot; <strong>Sent:</strong> ${formatDateTime(dist.distributed_at)}</div>
              <div><strong>To:</strong> ${esc(recipients || "—")}</div>
              ${dist.message ? `<div style="color:#5f5b56;margin-top:2px;">${esc(dist.message)}</div>` : ""}
            </div>`;
          })
          .join("")}`
      : "";

    const drawingsSection = linkedDrawings.length
      ? `${sectionHeading("Linked Drawings")}
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <thead><tr style="background:#f3f1ee;">
            <th style="padding:4px 6px;border:1px solid #e2ddd7;text-align:left;">Number</th>
            <th style="padding:4px 6px;border:1px solid #e2ddd7;text-align:left;">Title</th>
            <th style="padding:4px 6px;border:1px solid #e2ddd7;text-align:left;">Discipline</th>
          </tr></thead>
          <tbody>
            ${linkedDrawings
              .map((link) => {
                const drawing = link.drawings as { drawing_number?: string | null; title?: string | null; discipline?: string | null } | null;
                return `<tr>
                  <td style="padding:4px 6px;border:1px solid #e2ddd7;">${esc(drawing?.drawing_number)}</td>
                  <td style="padding:4px 6px;border:1px solid #e2ddd7;">${esc(drawing?.title)}</td>
                  <td style="padding:4px 6px;border:1px solid #e2ddd7;">${esc(drawing?.discipline)}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>`
      : "";

    const attachmentsSection = attachments.length
      ? `${sectionHeading("Attachments")}
        <ul style="margin:0;padding-left:18px;font-size:10px;">
          ${attachments.map((a) => `<li>${esc(a.title || a.file_name)}</li>`).join("")}
        </ul>`
      : "";

    const historySection = history.length
      ? `${sectionHeading("Status History")}
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <tbody>
            ${history
              .slice()
              .sort((a, b) => new Date(b.occurred_at ?? 0).getTime() - new Date(a.occurred_at ?? 0).getTime())
              .map(
                (entry) => `<tr>
                  <td style="padding:4px 6px;border:1px solid #e2ddd7;white-space:nowrap;">${formatDateTime(entry.occurred_at)}</td>
                  <td style="padding:4px 6px;border:1px solid #e2ddd7;">${esc(entry.action)}</td>
                  <td style="padding:4px 6px;border:1px solid #e2ddd7;">${esc(entry.new_status)}</td>
                  <td style="padding:4px 6px;border:1px solid #e2ddd7;">${resolveName(entry.actor_id)}</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>`
      : "";

    const bodyHtml = `${metaGrid}${workflowSection}${distributionSection}${drawingsSection}${attachmentsSection}${historySection}`;

    const projectLabel = project
      ? [project.project_number, project.name].filter(Boolean).join(" — ")
      : `Project ${projectId}`;

    const html = buildBrandedDocumentHtml({
      title: `Submittal #${submittal.submittal_number}${submittal.revision ? ` Rev ${submittal.revision}` : ""}`,
      subtitle: submittal.title || undefined,
      detail: projectLabel,
      bodyHtml,
      renderFooterInBody: false,
      contentWidth: "720px",
    });

    const pdfBuffer = await renderPdfFromHtml(html, {
      footerTemplate: buildBrandedFooterTemplate(),
      marginBottom: BRANDED_FOOTER_MARGIN,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="submittal-${submittal.submittal_number}.pdf"`,
      },
    });
  },
);
