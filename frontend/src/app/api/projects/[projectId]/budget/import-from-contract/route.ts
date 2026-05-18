import { withApiGuardrails } from "@/lib/guardrails/api";
import { NextResponse } from "next/server";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";
import { requirePermission } from "@/lib/permissions-guard";
import {
  activateBudgetCodes,
  BudgetCodeActivationError,
  type BudgetCodeActivationRow,
} from "@/lib/estimates/activate-budget-codes";

const MARKUP_BUDGET_CODE_BY_TYPE = {
  insurance: {
    costCode: "55-0050",
    costTypeCode: "R",
    description: "Insurance",
  },
  fee: {
    costCode: "55-0500",
    costTypeCode: "R",
    description: "Contractor Fee",
  },
} satisfies Record<string, BudgetCodeActivationRow>;

type MarkupType = keyof typeof MARKUP_BUDGET_CODE_BY_TYPE;

function isSupportedMarkupType(value: string | null): value is MarkupType {
  return value != null && value in MARKUP_BUDGET_CODE_BY_TYPE;
}

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
      .select("id, description, budget_code_id, cost_code_id, quantity, unit_cost, total_cost, unit_of_measure, line_number, markup_type")
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
    const markupBudgetCodeMap = new Map<MarkupType, {
      id: string;
      cost_code_id: string;
      cost_type_id: string;
    }>();

    if (budgetCodeIds.length > 0) {
      const { data: budgetCodes, error: budgetCodesError } = await supabase
        .from("project_budget_codes")
        .select("id, cost_code_id, cost_type_id")
        .in("id", budgetCodeIds);

      if (budgetCodesError) {
        return NextResponse.json(
          { error: "Failed to resolve project budget codes", details: budgetCodesError.message },
          { status: 500 },
        );
      }

      for (const bc of budgetCodes ?? []) {
        budgetCodeMap.set(bc.id, { cost_code_id: bc.cost_code_id, cost_type_id: bc.cost_type_id });
      }
    }

    const markupRowsToActivate = Array.from(
      new Map(
        lineItems
          .filter((item) => !item.budget_code_id && isSupportedMarkupType(item.markup_type))
          .map((item) => {
            const row = MARKUP_BUDGET_CODE_BY_TYPE[item.markup_type as MarkupType];
            return [`${row.costCode}|${row.costTypeCode}`, row] as const;
          }),
      ).values(),
    );

    if (markupRowsToActivate.length > 0) {
      try {
        const activation = await activateBudgetCodes(
          supabase as Parameters<typeof activateBudgetCodes>[0],
          numericProjectId,
          markupRowsToActivate,
        );

        for (const [markupType, row] of Object.entries(MARKUP_BUDGET_CODE_BY_TYPE)) {
          const costTypeId = activation.costTypeIdByCode.get(row.costTypeCode);
          if (!costTypeId) continue;
          const budgetCodeId = activation.budgetCodeByKey.get(`${row.costCode}|${costTypeId}`);
          if (!budgetCodeId) continue;

          budgetCodeMap.set(budgetCodeId, {
            cost_code_id: row.costCode,
            cost_type_id: costTypeId,
          });
          markupBudgetCodeMap.set(markupType as MarkupType, {
            id: budgetCodeId,
            cost_code_id: row.costCode,
            cost_type_id: costTypeId,
          });
        }
      } catch (error) {
        const details = error instanceof BudgetCodeActivationError ? error.details : undefined;
        return NextResponse.json(
          {
            error: "Failed to activate markup budget codes",
            details: details ?? (error instanceof Error ? error.message : "Unknown error"),
          },
          { status: 500 },
        );
      }
    }

    const resolvedItems = [];
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
      } else if (isSupportedMarkupType(item.markup_type) && markupBudgetCodeMap.has(item.markup_type)) {
        const bc = markupBudgetCodeMap.get(item.markup_type)!;
        costCodeId = bc.cost_code_id;
        costTypeId = bc.cost_type_id;
        budgetCodeId = bc.id;
      } else if (item.cost_code_id) {
        // Fallback: use cost_code_id directly, no cost type
        costCodeId = item.cost_code_id;
      }

      if (!costCodeId || !costTypeId) {
        skipped.push(`Line ${item.line_number}: "${item.description}" — no budget code or cost code mapped`);
        continue;
      }

      const originalAmount = item.total_cost ?? (item.unit_cost != null && item.quantity != null ? item.unit_cost * item.quantity : 0);

      resolvedItems.push({
        item,
        costCodeId,
        costTypeId,
        budgetCodeId,
        originalAmount,
      });
    }

    const resolvedBudgetCodeIds = Array.from(
      new Set(resolvedItems.map((row) => row.budgetCodeId).filter((id): id is string => id != null)),
    );
    const existingBudgetCodeIds = new Set<string>();

    if (resolvedBudgetCodeIds.length > 0) {
      const { data: existingLines, error: existingLinesError } = await supabase
        .from("budget_lines")
        .select("project_budget_code_id")
        .eq("project_id", numericProjectId)
        .in("project_budget_code_id", resolvedBudgetCodeIds);

      if (existingLinesError) {
        return NextResponse.json(
          { error: "Failed to check existing budget lines", details: existingLinesError.message },
          { status: 500 },
        );
      }

      for (const line of existingLines ?? []) {
        if (line.project_budget_code_id) existingBudgetCodeIds.add(line.project_budget_code_id);
      }
    }

    for (const { item, costCodeId, costTypeId, budgetCodeId, originalAmount } of resolvedItems) {
      if (budgetCodeId && existingBudgetCodeIds.has(budgetCodeId)) {
        skipped.push(`Line ${item.line_number}: "${item.description}" — budget line already exists`);
        continue;
      }

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
