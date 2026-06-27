import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { type NextRequest, NextResponse } from "next/server";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// GET /api/projects/[projectId]/invoicing/billing-periods/[periodId]
// Fetch a single billing period
export const GET = withApiGuardrails<{ projectId: string; periodId: string }>(
  "projects/[projectId]/invoicing/billing-periods/[periodId]#GET",
  async ({ request, params }) => {
  
    const supabase = await createClient();
    const { projectId, periodId } = params;

    const user = await getApiRouteUser();
    const authError = null as Error | null;

    if (authError) {
      return NextResponse.json(
        { error: "Authentication failed", details: authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/billing-periods/[periodId]#GET", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);

    const { data: period, error: periodError } = await supabase
      .from("billing_periods")
      .select("*")
      .eq("id", periodId)
      .eq("project_id", projectIdNum)
      .single();

    if (periodError) {
      if (periodError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Billing period not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch billing period", details: periodError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: period });
    },
);

// PATCH /api/projects/[projectId]/invoicing/billing-periods/[periodId]
// Update a billing period's name, start_date, end_date, due_date, or is_closed
export const PATCH = withApiGuardrails<{ projectId: string; periodId: string }>(
  "projects/[projectId]/invoicing/billing-periods/[periodId]#PATCH",
  async ({ request, params }) => {
  
    const supabase = await createClient();
    const { projectId, periodId } = params;

    const user = await getApiRouteUser();
    const authError = null as Error | null;

    if (authError) {
      return NextResponse.json(
        { error: "Authentication failed", details: authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/billing-periods/[periodId]#PATCH", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);
    const body = await request.json();

    const allowedFields = ["name", "start_date", "end_date", "due_date", "is_closed"];
    const updatePayload: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updatePayload[field] = body[field] === "" ? null : body[field];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 },
      );
    }

    // Verify the period exists and belongs to this project
    const { data: existing, error: fetchError } = await supabase
      .from("billing_periods")
      .select("id")
      .eq("id", periodId)
      .eq("project_id", projectIdNum)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Billing period not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to verify billing period", details: fetchError.message },
        { status: 500 },
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Billing period not found" },
        { status: 404 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("billing_periods")
      .update(updatePayload)
      .eq("id", periodId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "42501") {
        return NextResponse.json(
          { error: "Permission denied" },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: "Failed to update billing period", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: updated });
    },
);

// DELETE /api/projects/[projectId]/invoicing/billing-periods/[periodId]
// Delete a billing period — blocked (409) if any owner or subcontractor invoices reference it
export const DELETE = withApiGuardrails<{ projectId: string; periodId: string }>(
  "projects/[projectId]/invoicing/billing-periods/[periodId]#DELETE",
  async ({ request, params }) => {
  
    const supabase = await createClient();
    const { projectId, periodId } = params;

    const user = await getApiRouteUser();
    const authError = null as Error | null;

    if (authError) {
      return NextResponse.json(
        { error: "Authentication failed", details: authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/billing-periods/[periodId]#DELETE", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);

    // Verify the period exists and belongs to this project
    const { data: period, error: fetchError } = await supabase
      .from("billing_periods")
      .select("id")
      .eq("id", periodId)
      .eq("project_id", projectIdNum)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Billing period not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to verify billing period", details: fetchError.message },
        { status: 500 },
      );
    }

    if (!period) {
      return NextResponse.json(
        { error: "Billing period not found" },
        { status: 404 },
      );
    }

    // Check if any owner invoices reference this period
    const { count: ownerCount, error: ownerCheckError } = await supabase
      .from("owner_invoices")
      .select("id", { count: "exact", head: true })
      .eq("billing_period_id", periodId);

    if (ownerCheckError) {
      return NextResponse.json(
        { error: "Failed to check invoice references", details: ownerCheckError.message },
        { status: 500 },
      );
    }

    if ((ownerCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete billing period",
          message: `This billing period is referenced by ${ownerCount} owner invoice(s) and cannot be deleted.`,
        },
        { status: 409 },
      );
    }

    // Check if any subcontractor invoices reference this period
    const { count: subCount, error: subCheckError } = await supabase
      .from("subcontractor_invoices")
      .select("id", { count: "exact", head: true })
      .eq("billing_period_id", periodId);

    if (subCheckError) {
      return NextResponse.json(
        { error: "Failed to check invoice references", details: subCheckError.message },
        { status: 500 },
      );
    }

    if ((subCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete billing period",
          message: `This billing period is referenced by ${subCount} subcontractor invoice(s) and cannot be deleted.`,
        },
        { status: 409 },
      );
    }

    // Safe to delete
    const { error: deleteError } = await supabase
      .from("billing_periods")
      .delete()
      .eq("id", periodId);

    if (deleteError) {
      if (deleteError.code === "42501") {
        return NextResponse.json(
          { error: "Permission denied" },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: "Failed to delete billing period", details: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Billing period deleted successfully" });
    },
);
