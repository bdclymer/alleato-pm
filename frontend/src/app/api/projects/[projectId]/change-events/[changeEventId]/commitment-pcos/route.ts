/**
 * GET /api/projects/[projectId]/change-events/[changeEventId]/commitment-pcos
 *
 * Returns all commitment PCOs that this change event has been added to,
 * via the change_event_pco_links junction table (pco_type = "commitment").
 */

import { withApiGuardrails } from "@/lib/guardrails/api";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = withApiGuardrails(
  "projects/[projectId]/change-events/[changeEventId]/commitment-pcos#GET",
  async ({ params }) => {
    const { projectId, changeEventId } = await params;
    if (!UUID_RE.test(changeEventId)) {
      return NextResponse.json({ error: "Invalid change event id" }, { status: 400 });
    }
    const projectIdNum = parseInt(projectId, 10);
    // Use service client so RLS doesn't silently filter junction table rows.
    const supabase = createServiceClient();

    // Step 1: Get all commitment PCO links for this change event.
    // Two-step query because change_event_pco_links.pco_id is polymorphic
    // (no typed FK), so we join manually. Same pattern as prime-pcos route.
    const { data: links, error: linksError } = await supabase
      .from("change_event_pco_links")
      .select("id, pco_id, pco_type, linked_at")
      .eq("change_event_id", changeEventId)
      .eq("pco_type", "commitment")
      .order("linked_at", { ascending: false });

    if (linksError) {
      return apiErrorResponse(linksError);
    }

    const pcoIds = (links ?? []).map((l) => l.pco_id);

    if (pcoIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Step 2: Fetch commitment_pcos — select only columns the UI needs.
    const { data: pcos, error: pcosError } = await supabase
      .from("commitment_pcos")
      .select(
        "id, pco_number, title, status, total_amount, schedule_impact, commitment_id, commitment_type, created_at",
      )
      .in("id", pcoIds)
      .eq("project_id", projectIdNum);

    if (pcosError) {
      return apiErrorResponse(pcosError);
    }

    // Build an O(1) lookup map and merge with link metadata.
    const pcoMap = new Map((pcos ?? []).map((pco) => [pco.id, pco]));

    const result = (links ?? [])
      .map((link) => {
        const pco = pcoMap.get(link.pco_id);
        if (!pco) return null;
        return {
          linkId: link.id,
          linkedAt: link.linked_at,
          ...pco,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ data: result });
  },
);
