/**
 * ============================================================================
 * PCO CHANGE EVENTS GROUPING API ROUTE
 * ============================================================================
 *
 * GET    /api/projects/[projectId]/pcos/[pcoId]/change-events - List grouped CEs
 * POST   /api/projects/[projectId]/pcos/[pcoId]/change-events - Group a CE into PCO
 * DELETE /api/projects/[projectId]/pcos/[pcoId]/change-events - Ungroup a CE
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; pcoId: string }>;
}

/**
 * GET - List change events grouped into this PCO
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, pcoId } = await params;
    const numericPcoId = parseInt(pcoId, 10);

    if (isNaN(numericPcoId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: pcoChangeEvents, error } = await supabase
      .from("pco_change_events")
      .select("*")
      .eq("pco_id", numericPcoId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to fetch PCO change events:", error);
      return apiErrorResponse(error);
    }

    // Fetch full change event details
    const changeEventIds = (pcoChangeEvents || []).map(
      (pce: any) => pce.change_event_id
    );
    let changeEventsMap: Record<string, any> = {};
    if (changeEventIds.length > 0) {
      const { data: changeEvents } = await supabase
        .from("change_events")
        .select("id, number, title, type, status, scope, description")
        .in("id", changeEventIds);

      for (const ce of changeEvents || []) {
        changeEventsMap[ce.id] = ce;
      }
    }

    const result = (pcoChangeEvents || []).map((pce: any) => ({
      ...pce,
      changeEvent: changeEventsMap[pce.change_event_id] || null,
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST - Group a change event into this PCO
 * Body: { changeEventId: string, estimatedAmount?: number }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, pcoId } = await params;
    const numericProjectId = parseInt(projectId, 10);
    const numericPcoId = parseInt(pcoId, 10);

    if (isNaN(numericProjectId) || isNaN(numericPcoId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const guard = await requirePermission(numericProjectId, "change_orders", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!body.changeEventId) {
      return NextResponse.json(
        { error: "Validation error", details: "changeEventId is required" },
        { status: 400 }
      );
    }

    // Check PCO exists
    const { data: pco, error: pcoError } = await supabase
      .from("potential_change_orders")
      .select("id, title")
      .eq("id", numericPcoId)
      .eq("project_id", numericProjectId)
      .single();

    if (pcoError || !pco) {
      return NextResponse.json(
        { error: "PCO not found" },
        { status: 404 }
      );
    }

    // Check change event exists
    const { data: changeEvent, error: ceError } = await supabase
      .from("change_events")
      .select("id, number, title")
      .eq("id", body.changeEventId)
      .eq("project_id", numericProjectId)
      .single();

    if (ceError || !changeEvent) {
      return NextResponse.json(
        { error: "Change event not found" },
        { status: 404 }
      );
    }

    // Check if already grouped
    const { data: existingLink } = await supabase
      .from("pco_change_events")
      .select("id")
      .eq("pco_id", numericPcoId)
      .eq("change_event_id", body.changeEventId)
      .maybeSingle();

    if (existingLink) {
      return NextResponse.json(
        { error: "Change event is already grouped into this PCO" },
        { status: 409 }
      );
    }

    // Get next sort order
    const { data: lastItem } = await supabase
      .from("pco_change_events")
      .select("sort_order")
      .eq("pco_id", numericPcoId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = (lastItem?.sort_order ?? 0) + 1;

    const { data, error } = await supabase
      .from("pco_change_events")
      .insert({
        pco_id: numericPcoId,
        change_event_id: body.changeEventId,
        estimated_amount: body.estimatedAmount ?? null,
        sort_order: nextSortOrder,
        added_by_id: user.id,
        added_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to group change event:", error);
      return apiErrorResponse(error);
    }

    // Write timeline event
    await supabase.from("timeline_events").insert({
      project_id: numericProjectId,
      parent_type: "PCO",
      parent_id: numericPcoId.toString(),
      event_type: "GROUPED_INTO_PCO",
      actor_id: user.id,
      summary: `Change event ${changeEvent.number} "${changeEvent.title}" grouped into PCO`,
      metadata: { change_event_id: body.changeEventId },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * DELETE - Ungroup a change event from this PCO
 * Body: { changeEventId: string }
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, pcoId } = await params;
    const numericProjectId = parseInt(projectId, 10);
    const numericPcoId = parseInt(pcoId, 10);

    if (isNaN(numericProjectId) || isNaN(numericPcoId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const guard = await requirePermission(numericProjectId, "change_orders", "admin");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!body.changeEventId) {
      return NextResponse.json(
        { error: "Validation error", details: "changeEventId is required" },
        { status: 400 }
      );
    }

    // Get change event info for timeline
    const { data: changeEvent } = await supabase
      .from("change_events")
      .select("id, number, title")
      .eq("id", body.changeEventId)
      .single();

    const { data, error } = await supabase
      .from("pco_change_events")
      .delete()
      .eq("pco_id", numericPcoId)
      .eq("change_event_id", body.changeEventId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Change event not found in this PCO" },
        { status: 404 }
      );
    }

    // Write timeline event
    await supabase.from("timeline_events").insert({
      project_id: numericProjectId,
      parent_type: "PCO",
      parent_id: numericPcoId.toString(),
      event_type: "UNGROUPED_FROM_PCO",
      actor_id: user.id,
      summary: `Change event ${changeEvent?.number || ""} "${changeEvent?.title || ""}" removed from PCO`,
      metadata: { change_event_id: body.changeEventId },
      created_at: new Date().toISOString(),
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
