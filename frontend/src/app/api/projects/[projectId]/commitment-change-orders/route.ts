import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/commitment-change-orders
 *
 * Returns all change orders across all commitments for a project.
 * Joins contract_change_orders → commitments_unified via contract_id = commitments_unified.id
 * and filters by commitments_unified.project_id.
 *
 * Response shape:
 * {
 *   data: Array<{
 *     id, number, title, status, amount, requested_date, approved_date,
 *     commitment_id, commitment_number
 *   }>,
 *   meta: { total_count, total_amount }
 * }
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/commitment-change-orders#GET",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();

    // Fetch all commitments for the project first, then fetch their change orders.
    // We do a two-step query because contract_change_orders has no project_id column.
    const { data: commitments, error: commitmentsError } = await supabase
      .from("commitments_unified")
      .select("id, contract_number")
      .eq("project_id", Number(projectId))
      .is("deleted_at", null);

    if (commitmentsError) {
      return apiErrorResponse(commitmentsError);
    }

    if (!commitments || commitments.length === 0) {
      return NextResponse.json({ data: [], meta: { total_count: 0, total_amount: 0 } });
    }

    const commitmentIds = commitments.map((c) => c.id).filter(Boolean) as string[];

    const { data: changeOrders, error: coError } = await supabase
      .from("contract_change_orders")
      .select(
        "id, change_order_number, description, status, amount, requested_date, approved_date, contract_id",
      )
      .in("contract_id", commitmentIds)
      .order("requested_date", { ascending: false });

    if (coError) {
      return apiErrorResponse(coError);
    }

    // Build a map of commitment id → contract_number for enriching the response
    const commitmentMap = new Map(
      commitments.map((c) => [c.id, c.contract_number ?? ""]),
    );

    const data = (changeOrders ?? []).map((co) => ({
      id: co.id,
      number: co.change_order_number,
      title: co.description,
      status: co.status?.toLowerCase() ?? "draft",
      amount: Number(co.amount) || 0,
      requested_date: co.requested_date,
      approved_date: co.approved_date,
      commitment_id: co.contract_id,
      commitment_number: commitmentMap.get(co.contract_id) ?? null,
    }));

    const totalAmount = data.reduce((sum, co) => sum + co.amount, 0);

    return NextResponse.json({
      data,
      meta: {
        total_count: data.length,
        total_amount: totalAmount,
      },
    });
    },
);

/**
 * POST /api/projects/[projectId]/commitment-change-orders
 * Create a new commitment change order.
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/commitment-change-orders#POST",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const projectIdNum = Number(projectId);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/commitment-change-orders#POST", message: "Authentication required." });
    }

    const guard = await requirePermission(projectIdNum, "contracts", "write");
    if (guard.denied) return guard.response;

    const body = await request.json();

    if (!body.contract_id) {
      return NextResponse.json(
        { error: "contract_id (commitment ID) is required" },
        { status: 400 },
      );
    }

    // Verify the commitment belongs to this project
    const { data: commitment, error: commitmentError } = await supabase
      .from("commitments_unified")
      .select("id, project_id")
      .eq("id", body.contract_id)
      .is("deleted_at", null)
      .single();

    if (commitmentError || !commitment) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 },
      );
    }

    if (commitment.project_id !== Number(projectId)) {
      return NextResponse.json(
        { error: "Commitment does not belong to this project" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("contract_change_orders")
      .insert({
        change_order_number: body.change_order_number,
        description: body.description ?? "",
        amount: body.amount ?? 0,
        contract_id: body.contract_id,
        status: body.status || "draft",
        requested_date: body.requested_date ?? new Date().toISOString().split("T")[0],
        title: body.title ?? null,
        change_reason: body.change_reason ?? null,
        designated_reviewer: body.designated_reviewer ?? null,
        requested_by: body.requested_by ?? null,
        due_date: body.due_date ?? null,
        invoiced_date: body.invoiced_date ?? null,
        schedule_impact: body.schedule_impact ?? null,
        location: body.location ?? null,
        reference: body.reference ?? null,
        field_change: body.field_change ?? false,
        is_private: body.is_private ?? false,
        paid_in_full: body.paid_in_full ?? false,
        executed: body.executed ?? false,
        revision: body.revision ?? 0,
        signed_co_received_date: body.signed_co_received_date ?? null,
        paid_date: body.paid_date ?? null,
        request_received_from: body.request_received_from ?? null,
        contract_company: body.contract_company ?? null,
        contract_type: body.contract_type ?? null,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    // Link change events if provided (2-tier: CE → CCO directly)
    const changeEventIds: string[] = body.change_event_ids ?? [];
    if (changeEventIds.length > 0 && data?.id) {
      // Mark each change event as sent to commitment CO
      const { error: ceUpdateError } = await supabase
        .from("change_events")
        .update({ sent_to_commitment_pco: true })
        .in("id", changeEventIds);

      if (ceUpdateError) {
        console.error("Failed to update change event tracking flags:", ceUpdateError);
      }

      // Create link records in change_event_pco_links
      const links = changeEventIds.map((ceId) => ({
        change_event_id: ceId,
        pco_id: data.id,
        pco_type: "commitment_co",
      }));

      const { error: linkError } = await supabase
        .from("change_event_pco_links")
        .insert(links);

      if (linkError) {
        console.error("Failed to create CE→CCO links:", linkError);
      }
    }

    return NextResponse.json(data, { status: 201 });
    },
);
