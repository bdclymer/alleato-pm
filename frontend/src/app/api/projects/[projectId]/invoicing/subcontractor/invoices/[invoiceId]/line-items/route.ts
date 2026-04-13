import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// PATCH /api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/line-items
// Bulk-update editable SOV fields on line items of a draft / revise_and_resubmit invoice.
// Accepts: { updates: Array<{ id: number; work_completed_period?: number; materials_stored?: number; retainage_pct?: number; materials_retainage_pct?: number }> }
// Server recomputes derived totals (pct, total, work_retainage_amount, materials_retainage_amount, balance, net).
export const PATCH = withApiGuardrails<{ projectId: string; invoiceId: string }>(
  "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/line-items#PATCH",
  async ({ request }) => {
  
    const supabase = await createClient();
    const { projectId, invoiceId } = await context.params;

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
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/line-items#PATCH", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);
    const invoiceIdNum = parseInt(invoiceId, 10);

    const body = await request.json().catch(() => null);
    const updates = Array.isArray(body?.updates) ? body.updates : null;
    if (!updates || updates.length === 0) {
      return NextResponse.json(
        { error: "updates array is required" },
        { status: 400 },
      );
    }

    // Verify invoice exists and is editable
    const { data: invoice, error: fetchError } = await supabase
      .from("subcontractor_invoices")
      .select("id, status")
      .eq("id", invoiceIdNum)
      .eq("project_id", projectIdNum)
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

    if (!["draft", "revise_and_resubmit"].includes(invoice.status)) {
      return NextResponse.json(
        {
          error:
            "Line items can only be edited when the invoice is Draft or Revise & Resubmit",
        },
        { status: 400 },
      );
    }

    // Fetch all impacted rows up front so we can recompute derived values
    const ids = updates
      .map((u: { id: unknown }) => Number(u.id))
      .filter((n: number) => Number.isFinite(n));

    const { data: existingRows, error: rowsError } = await supabase
      .from("subcontractor_invoice_line_items")
      .select(
        "id, invoice_id, scheduled_value, work_completed_previous, work_completed_period, materials_stored, retainage_pct, materials_retainage_pct",
      )
      .in("id", ids)
      .eq("invoice_id", invoiceIdNum);

    if (rowsError) {
      return NextResponse.json(
        { error: "Failed to load line items", details: rowsError.message },
        { status: 500 },
      );
    }

    const rowById = new Map(existingRows?.map((r) => [r.id, r]) ?? []);

    const results: Array<{ id: number; ok: boolean; error?: string }> = [];
    for (const patch of updates) {
      const id = Number(patch.id);
      const existing = rowById.get(id);
      if (!existing) {
        results.push({ id, ok: false, error: "Line item not on this invoice" });
        continue;
      }

      const scheduled = Number(existing.scheduled_value) || 0;
      const previous = Number(existing.work_completed_previous) || 0;
      const thisPeriod =
        patch.work_completed_period !== undefined
          ? Number(patch.work_completed_period) || 0
          : Number(existing.work_completed_period) || 0;
      const stored =
        patch.materials_stored !== undefined
          ? Number(patch.materials_stored) || 0
          : Number(existing.materials_stored) || 0;
      const workRetainagePct =
        patch.retainage_pct !== undefined
          ? Number(patch.retainage_pct) || 0
          : Number(existing.retainage_pct) || 0;
      const materialsRetainagePct =
        patch.materials_retainage_pct !== undefined
          ? Number(patch.materials_retainage_pct) || 0
          : Number(existing.materials_retainage_pct) || 0;

      // total_completed_stored, balance_to_finish, and net_amount_this_period
      // are GENERATED ALWAYS columns in Postgres — do not write them.
      const totalCompletedStored = previous + thisPeriod + stored;
      const workCompletedPct =
        scheduled > 0 ? (totalCompletedStored / scheduled) * 100 : 0;
      // Work retainage is applied to work completed (previous + this period),
      // materials retainage is applied only to materials stored.
      const workRetainageAmount =
        ((previous + thisPeriod) * workRetainagePct) / 100;
      const materialsRetainageAmount =
        (stored * materialsRetainagePct) / 100;

      const { error: updateError } = await supabase
        .from("subcontractor_invoice_line_items")
        .update({
          work_completed_period: thisPeriod,
          materials_stored: stored,
          retainage_pct: workRetainagePct,
          retainage_amount: workRetainageAmount,
          materials_retainage_pct: materialsRetainagePct,
          materials_retainage_amount: materialsRetainageAmount,
          work_completed_pct: workCompletedPct,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        results.push({ id, ok: false, error: updateError.message });
      } else {
        results.push({ id, ok: true });
        await supabase.from("subcontractor_invoice_audit_log").insert({
          invoice_id: invoiceIdNum,
          actor_user_id: user.id,
          actor_email: user.email ?? null,
          event_type: "line_item.updated",
          field_name: `line_item_${id}`,
          old_value: {
            work_completed_period: Number(existing.work_completed_period) || 0,
            materials_stored: Number(existing.materials_stored) || 0,
            retainage_pct: Number(existing.retainage_pct) || 0,
            materials_retainage_pct:
              Number(existing.materials_retainage_pct) || 0,
          },
          new_value: {
            work_completed_period: thisPeriod,
            materials_stored: stored,
            retainage_pct: workRetainagePct,
            materials_retainage_pct: materialsRetainagePct,
            retainage_amount: workRetainageAmount,
            materials_retainage_amount: materialsRetainageAmount,
          },
        });
      }
    }

    const allOk = results.every((r) => r.ok);
    return NextResponse.json(
      { data: { results }, message: allOk ? "Line items updated" : "Some updates failed" },
      { status: allOk ? 200 : 207 },
    );
    },
);
