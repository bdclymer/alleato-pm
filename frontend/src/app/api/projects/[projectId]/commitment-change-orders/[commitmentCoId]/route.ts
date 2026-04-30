import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";
import { getScopedCommitmentChangeOrder } from "@/lib/change-orders/commitment-change-orders";

interface RouteParams {
  params: Promise<{ projectId: string; commitmentCoId: string }>;
}

/**
 * GET /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]
 *
 * Direct lookup of a contract_change_orders row by UUID,
 * verified against the project via the linked commitment.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/commitment-change-orders/[commitmentCoId]#GET",
  async ({ request, params }) => {
    const { projectId, commitmentCoId } = await params;
    const supabase = await createClient();

    const scoped = await getScopedCommitmentChangeOrder(
      supabase,
      Number(projectId),
      commitmentCoId,
    );

    if (!scoped) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(scoped);
  },
);

/**
 * PUT /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]
 * Update a commitment change order.
 */
export const PUT = withApiGuardrails(
  "projects/[projectId]/commitment-change-orders/[commitmentCoId]#PUT",
  async ({ request, params }) => {
    const { projectId, commitmentCoId } = await params;
    const projectIdNum = Number(projectId);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where:
          "projects/[projectId]/commitment-change-orders/[commitmentCoId]#PUT",
        message: "Authentication required.",
      });
    }

    const guard = await requirePermission(projectIdNum, "contracts", "write");
    if (guard.denied) return guard.response;

    const scoped = await getScopedCommitmentChangeOrder(
      supabase,
      projectIdNum,
      commitmentCoId,
    );

    if (!scoped) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();

    // Strip fields that shouldn't be directly updated
    const {
      id: _id,
      created_at: _ca,
      updated_at: _ua,
      commitment_number: _cn,
      ...updateData
    } = body;
    if ("description" in updateData) {
      updateData.description = updateData.description ?? "";
    }

    const { data, error } = await supabase
      .from("contract_change_orders")
      .update(updateData)
      .eq("id", commitmentCoId)
      .select("*")
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
  },
);

/**
 * DELETE /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]
 * Delete a commitment change order.
 */
export const DELETE = withApiGuardrails(
  "projects/[projectId]/commitment-change-orders/[commitmentCoId]#DELETE",
  async ({ request, params }) => {
    const { projectId, commitmentCoId } = await params;
    const projectIdNum = Number(projectId);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where:
          "projects/[projectId]/commitment-change-orders/[commitmentCoId]#DELETE",
        message: "Authentication required.",
      });
    }

    const guard = await requirePermission(projectIdNum, "contracts", "admin");
    if (guard.denied) return guard.response;

    const scoped = await getScopedCommitmentChangeOrder(
      supabase,
      projectIdNum,
      commitmentCoId,
    );

    if (!scoped) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("contract_change_orders")
      .delete()
      .eq("id", commitmentCoId);

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ message: "Deleted successfully" });
  },
);
