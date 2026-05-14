import { withApiGuardrails } from "@/lib/guardrails/api";
import { NextResponse } from "next/server";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";
import { requirePermission } from "@/lib/permissions-guard";

export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/budget/import-from-contract#POST",
  async ({ request, params }) => {
    const { projectId } = params;
    const numericProjectId = parseInt(projectId, 10);

    if (Number.isNaN(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const guard = await requirePermission(numericProjectId, "budget", "write");
    if (guard.denied) return guard.response;

    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) return authResult;
    const supabase = authResult.serviceClient;

    const body = await request.json() as { contractId?: string };
    const { contractId } = body;

    if (!contractId) {
      return NextResponse.json({ error: "contractId is required" }, { status: 400 });
    }

    // Verify the contract belongs to this project
    const { data: contract } = await supabase
      .from("prime_contracts")
      .select("id, title, contract_number")
      .eq("id", contractId)
      .eq("project_id", numericProjectId)
      .single();

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Fetch all SOV line items for the contract
    const { data: lineItems, error: lineItemsError } = await supabase
      .from("contract_line_items")
      .select("id, description, budget_code_id, cost_code_id, quantity, unit_cost, total_cost, unit_of_measure, line_number")
      .eq("contract_id", contractId)
      .order("line_number", { ascending: true });

    if (lineItemsError) {
      return NextResponse.json(
        { error: "Failed to fetch contract line items", details: lineItemsError.message },
        { status: 500 },
      );
    }

    if (!lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { error: "No line items found in the contract's Schedule of Values" },
        { status: 400 },
      );
    }

    // Collect all budget_code_ids to batch-fetch project_budget_codes
    const budgetCodeIds = Array.from(
      new Set(lineItems.map((li) => li.budget_code_id).filter((id): id is string => id != null)),
    );

    const budgetCodeMap = new Map<string, { cost_code_id: string; cost_type_id: string | null }>();

    if (budgetCodeIds.length > 0) {
      const { data: budgetCodes } = await supabase
        .from("project_budget_codes")
        .select("id, cost_code_id, cost_type_id")
        .in("id", budgetCodeIds);

      for (const bc of budgetCodes ?? []) {
        budgetCodeMap.set(bc.id, { cost_code_id: bc.cost_code_id, cost_type_id: bc.cost_type_id });
      }
    }

    const imported: unknown[] = [];
    const skipped: string[] = [];

    for (const item of lineItems) {
      // Resolve cost_code_id and cost_type_id
      let costCodeId: string | null = null;
      let costTypeId: string | null = null;
      let budgetCodeId: string | null = null;

      if (item.budget_code_id && budgetCodeMap.has(item.budget_code_id)) {
        const bc = budgetCodeMap.get(item.budget_code_id)!;
        costCodeId = bc.cost_code_id;
        costTypeId = bc.cost_type_id;
        budgetCodeId = item.budget_code_id;
      } else if (item.cost_code_id) {
        // Fallback: use cost_code_id directly, no cost type
        costCodeId = item.cost_code_id;
      }

      if (!costCodeId) {
        skipped.push(`Line ${item.line_number}: "${item.description}" — no budget code or cost code mapped`);
        continue;
      }

      const originalAmount = item.total_cost ?? (item.unit_cost != null && item.quantity != null ? item.unit_cost * item.quantity : 0);

      const { data: inserted, error: insertError } = await supabase
        .from("budget_lines")
        .insert({
          project_id: numericProjectId,
          cost_code_id: costCodeId,
          cost_type_id: costTypeId,
          project_budget_code_id: budgetCodeId,
          description: item.description || null,
          original_amount: originalAmount,
          quantity: item.quantity ?? null,
          unit_cost: item.unit_cost ?? null,
          unit_of_measure: item.unit_of_measure ?? null,
        })
        .select("id")
        .single();

      if (insertError) {
        skipped.push(`Line ${item.line_number}: "${item.description}" — ${insertError.message}`);
      } else {
        imported.push(inserted);
      }
    }

    return NextResponse.json({
      success: true,
      importedCount: imported.length,
      totalRows: lineItems.length,
      skippedCount: skipped.length,
      skipped: skipped.length > 0 ? skipped : undefined,
      message: `Imported ${imported.length} of ${lineItems.length} line items from "${contract.title || contract.contract_number}"`,
    });
  },
);
