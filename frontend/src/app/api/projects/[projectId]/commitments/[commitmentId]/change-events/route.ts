import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[projectId]/commitments/[commitmentId]/change-events
 *
 * Returns change events linked to a specific commitment through
 * change_event_pco_links → commitment_pcos or contract_change_orders.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/commitments/[commitmentId]/change-events#GET",
  async ({ params }) => {
    const { projectId, commitmentId } = await params;
    const supabase = await createClient();

    // Step 1: Get all commitment PCO IDs for this commitment
    const { data: pcos, error: pcoError } = await supabase
      .from("commitment_pcos")
      .select("id")
      .eq("commitment_id", commitmentId);

    if (pcoError) return apiErrorResponse(pcoError);

    // Step 2: Get all CCO IDs for this commitment
    const { data: ccos, error: ccoError } = await supabase
      .from("contract_change_orders")
      .select("id")
      .eq("contract_id", commitmentId);

    if (ccoError) return apiErrorResponse(ccoError);

    const pcoIds = (pcos ?? []).map((p) => p.id);
    const ccoIds = (ccos ?? []).map((c) => c.id);
    const allLinkedIds = [...pcoIds, ...ccoIds];

    if (allLinkedIds.length === 0) {
      return NextResponse.json({ data: [], meta: { total_count: 0 } });
    }

    // Step 3: Get change event IDs linked to these PCOs/CCOs
    const { data: links, error: linkError } = await supabase
      .from("change_event_pco_links")
      .select("change_event_id")
      .in("pco_id", allLinkedIds);

    if (linkError) return apiErrorResponse(linkError);

    const ceIds = [...new Set((links ?? []).map((l) => l.change_event_id))];

    if (ceIds.length === 0) {
      return NextResponse.json({ data: [], meta: { total_count: 0 } });
    }

    // Step 4: Fetch the actual change events
    const { data: changeEvents, error: ceError } = await supabase
      .from("change_events")
      .select("id, number, title, status, reason, scope, type, created_at, description")
      .in("id", ceIds)
      .eq("project_id", Number(projectId))
      .is("deleted_at", null)
      .order("number", { ascending: true });

    if (ceError) return apiErrorResponse(ceError);

    return NextResponse.json({
      data: changeEvents ?? [],
      meta: { total_count: (changeEvents ?? []).length },
    });
  },
);
