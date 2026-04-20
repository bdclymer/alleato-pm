import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions-guard";
import { renderPdfFromHtml, buildChangeEventHtml } from "@/lib/documents/pdf";

// Puppeteer requires the Node.js runtime — Edge runtime does not support it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiGuardrails(
  "projects/[projectId]/change-events/[changeEventId]/pdf#GET",
  async ({ params }) => {
    const { projectId, changeEventId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const guard = await requirePermission(projectIdNum, "change_orders", "read");
    if (guard.denied) return guard.response;

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
      .select("id, name, number, address, city, state")
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
    const htmlContent = buildChangeEventHtml({ ...changeEvent, creator }, lineItems, project);
    const pdfBuffer = await renderPdfFromHtml(htmlContent);

    const ceNumber = changeEvent.number || changeEvent.id;
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="change-event-${ceNumber}.pdf"`,
      },
    });
  },
);
