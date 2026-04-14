import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BudgetLineItemsPayloadSchema } from "@/lib/schemas/budget";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";
import {
  BudgetFetchError,
  computeBudgetGrandTotals,
} from "@/lib/budget/compute-grand-totals";


// GET /api/projects/[id]/budget - Fetch budget data for a project
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/budget#GET",
  async ({ request, params }) => {

    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    try {
      const { lineItems, grandTotals } = await computeBudgetGrandTotals(
        supabase,
        projectIdNum,
      );
      return NextResponse.json({ lineItems, grandTotals });
    } catch (error) {
      if (error instanceof BudgetFetchError) {
        return apiErrorResponse(error.cause);
      }
      throw error;
    }
  },
);


// POST /api/projects/[id]/budget - Create budget line items
export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/budget#POST",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    // Permission check: writing budget lines requires "write" on budget
    const guard = await requirePermission(projectIdNum, "budget", "write");
    if (guard.denied) return guard.response;

    const body = await request.json();
    const parsed = BudgetLineItemsPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const normalizedLineItems = parsed.data.lineItems.map((item) => ({
      costCodeId: item.costCodeId,
      costTypeId: item.costType ?? null,
      qty: item.qty && item.qty !== "" ? parseFloat(item.qty) : null,
      uom: item.uom ?? null,
      unitCost:
        item.unitCost && item.unitCost !== ""
          ? parseFloat(item.unitCost)
          : null,
      amount: parseFloat(item.amount),
      description: item.description ?? null,
    }));

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 },
      );
    }

    // Look up cost code IDs from the code strings or IDs
    const costCodes = normalizedLineItems.map((item) => item.costCodeId);
    const { data: costCodeData, error: codeError } = await supabase
      .from("cost_codes")
      .select("id")
      .in("id", costCodes);

    if (codeError) {
      return apiErrorResponse(codeError);
    }

    // Create a map of code ID to verify existence
    const validCostCodeIds = new Set((costCodeData || []).map((cc) => cc.id));

    // Resolve cost type values to UUIDs.
    // The client may send either a letter code ("L", "M", "S") or an already-resolved UUID.
    // UUIDs are passed through; letter codes are looked up via cost_code_types.code.
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const letterCodesToResolve = normalizedLineItems
      .map((item) => item.costTypeId)
      .filter((code): code is string => code !== null && !UUID_REGEX.test(code));

    let codeToUuidMap = new Map<string, string>();
    if (letterCodesToResolve.length > 0) {
      const { data: costTypeData, error: typeError } = await supabase
        .from("cost_code_types")
        .select("id, code")
        .in("code", letterCodesToResolve);

      if (typeError) {
        return apiErrorResponse(typeError);
      }
      codeToUuidMap = new Map((costTypeData || []).map((ct) => [ct.code, ct.id]));
    }

    // Replace letter codes with resolved UUIDs; pass UUIDs through unchanged
    const resolvedLineItems = normalizedLineItems.map((item) => ({
      ...item,
      costTypeId: item.costTypeId
        ? (UUID_REGEX.test(item.costTypeId) ? item.costTypeId : (codeToUuidMap.get(item.costTypeId) ?? null))
        : null,
    }));

    // Create budget_lines using new schema
    const results = [];

    for (const item of resolvedLineItems) {
      if (!validCostCodeIds.has(item.costCodeId)) {
        throw new Error(`Cost code not found: ${item.costCodeId}`);
      }

      // Create or update budget_line
      // First try to find existing budget_line
      let query = supabase
        .from("budget_lines")
        .select("id, original_amount")
        .eq("project_id", projectIdNum)
        .eq("cost_code_id", item.costCodeId)
        .is("sub_job_id", null);

      if (item.costTypeId) {
        query = query.eq("cost_type_id", item.costTypeId);
      } else {
        query = query.is("cost_type_id", null);
      }

      const { data: existingBudgetLine } = await query.maybeSingle();

      let budgetLine: { id: string };
      if (existingBudgetLine) {
        // Update existing budget line - add to original amount
        const newAmount =
          (existingBudgetLine.original_amount || 0) + item.amount;
        const { data: updatedLine, error: updateError } = await supabase
          .from("budget_lines")
          .update({
            original_amount: newAmount,
            updated_by: user.id,
          })
          .eq("id", existingBudgetLine.id)
          .select()
          .single();

        if (updateError) {
          return apiErrorResponse(updateError);
        }
        budgetLine = updatedLine;
      } else {
        // Create new budget_line. cost_type_id is required by the DB schema.
        if (!item.costTypeId) {
          return NextResponse.json(
            {
              error:
                "cost_type_id is required for new budget lines. Cost type could not be resolved.",
              costCodeId: item.costCodeId,
            },
            { status: 400 },
          );
        }
        const { data: newBudgetLine, error: blError } = await supabase
          .from("budget_lines")
          .insert({
            project_id: projectIdNum,
            cost_code_id: item.costCodeId,
            cost_type_id: item.costTypeId,
            sub_job_id: null,
            description: item.description || null,
            original_amount: item.amount || 0,
            quantity: item.qty,
            unit_of_measure: item.uom,
            unit_cost: item.unitCost,
            created_by: user?.id,
          })
          .select()
          .single();

        if (blError) {
          return apiErrorResponse(blError);
        }
        budgetLine = newBudgetLine;
      }

      results.push(budgetLine);
    }

    // Recalculate total budget from all budget lines for the project
    const { data: allBudgetLines, error: totalsError } = await supabase
      .from("budget_lines")
      .select("original_amount")
      .eq("project_id", projectIdNum);

    const totalBudget = (allBudgetLines || []).reduce(
      (sum, line) => sum + (Number(line.original_amount) || 0),
      0,
    );

    if (!totalsError) {
      const { error: projectUpdateError } = await supabase
        .from("projects")
        .update({
          budget: totalBudget,
        })
        .eq("id", projectIdNum);

      if (projectUpdateError) {
        // Don't fail the request - line items were created successfully
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      totalBudget,
      message: `Successfully created ${results.length} budget line(s)`,
    });
    },
);
