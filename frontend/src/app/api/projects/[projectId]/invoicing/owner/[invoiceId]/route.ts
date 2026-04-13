import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

// GET /api/projects/[projectId]/invoicing/owner/[invoiceId]
// Fetch a single owner invoice with line items
export const GET = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/owner/[invoiceId]#GET",
  async ({ request, params }) => {
  
    const supabase = await createClient();
    const { projectId, invoiceId } = params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: "Authentication failed", details: authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/owner/[invoiceId]#GET", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);

    // Fetch invoice with line items, verify it belongs to the project
    const { data: invoice, error: invoiceError } = await supabase
      .from("owner_invoices")
      .select(
        `
        *,
        owner_invoice_line_items(*),
        prime_contracts!inner(project_id, retention_percentage)
      `,
      )
      .eq("id", invoiceIdNum)
      .eq("prime_contracts.project_id", projectIdNum)
      .single();

    if (invoiceError) {
      // PGRST116 = no rows returned
      if (invoiceError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: "Failed to fetch invoice", details: invoiceError.message },
        { status: 500 },
      );
    }

    // Compute total_amount
    const lineItems = invoice.owner_invoice_line_items || [];
    const total_amount = lineItems.reduce(
      (sum: number, item: { approved_amount: number | null }) => sum + (item.approved_amount || 0),
      0,
    );

    // Extract retention_percentage from contracts join, then strip join data
    const contractRetentionPercentage =
      Array.isArray(invoice.prime_contracts)
        ? (invoice.prime_contracts[0]?.retention_percentage ?? null)
        : (invoice.prime_contracts as { retention_percentage: number | null } | null)?.retention_percentage ?? null;

    const { prime_contracts: _pc, ...invoiceData } = invoice;

    return NextResponse.json({
      data: {
        ...invoiceData,
        total_amount,
        contract_retention_percentage: contractRetentionPercentage,
      },
    });
    },
);

// PATCH /api/projects/[projectId]/invoicing/owner/[invoiceId]
// Update an owner invoice (only if status is draft)
export const PATCH = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/owner/[invoiceId]#PATCH",
  async ({ request, params }) => {
  
    const { projectId, invoiceId } = params;
    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);

    const guard = await requirePermission(projectIdNum, "contracts", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();

    // Parse and validate the request body
    const body = await request.json();
    const allowedFields = ["invoice_number", "period_start", "period_end", "billing_date", "status", "notes"];
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

    // Verify the invoice exists and belongs to the project
    const { data: existing, error: fetchError } = await supabase
      .from("owner_invoices")
      .select(`id, status, prime_contracts!inner(project_id)`)
      .eq("id", invoiceIdNum)
      .eq("prime_contracts.project_id", projectIdNum)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to verify invoice", details: fetchError.message },
        { status: 500 },
      );
    }

    // Allow edits on draft and revise_and_resubmit invoices
    const editableStatuses = ["draft", "revise_and_resubmit"];
    if (!editableStatuses.includes(existing.status)) {
      return NextResponse.json(
        {
          error: "Cannot edit invoice",
          message: `Invoice status is '${existing.status}'. Only draft or revise-and-resubmit invoices can be edited.`,
        },
        { status: 400 },
      );
    }

    // Apply the update
    const { data: updated, error: updateError } = await supabase
      .from("owner_invoices")
      .update(updatePayload)
      .eq("id", invoiceIdNum)
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
        { error: "Failed to update invoice", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: updated });
    },
);

// DELETE /api/projects/[projectId]/invoicing/owner/[invoiceId]
// Delete an owner invoice (only if not approved or paid)
export const DELETE = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/owner/[invoiceId]#DELETE",
  async ({ request, params }) => {
  
    const { projectId, invoiceId } = params;
    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);

    const guard = await requirePermission(projectIdNum, "contracts", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();

    // First, verify the invoice exists and belongs to the project
    const { data: invoice, error: fetchError } = await supabase
      .from("owner_invoices")
      .select(
        `
        *,
        prime_contracts!inner(project_id)
      `,
      )
      .eq("id", invoiceIdNum)
      .eq("prime_contracts.project_id", projectIdNum)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: "Failed to verify invoice", details: fetchError.message },
        { status: 500 },
      );
    }

    // Only allow deletion if status is not approved or paid
    if (invoice.status === "approved" || invoice.status === "paid") {
      return NextResponse.json(
        {
          error: "Cannot delete approved or paid invoices",
          message: `Invoice status is '${invoice.status}'. Only draft, submitted, or void invoices can be deleted.`,
        },
        { status: 400 },
      );
    }

    // Delete the invoice (cascade will handle line items)
    const { error: deleteError } = await supabase
      .from("owner_invoices")
      .delete()
      .eq("id", invoiceIdNum);

    if (deleteError) {
      // 42501 = RLS policy blocked
      if (deleteError.code === "42501") {
        return NextResponse.json(
          { error: "Permission denied" },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { error: "Failed to delete invoice", details: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Invoice deleted successfully",
    });
    },
);
