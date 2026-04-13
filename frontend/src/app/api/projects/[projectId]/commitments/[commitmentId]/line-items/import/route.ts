import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";
import { requirePermission } from "@/lib/permissions-guard";

type BudgetLine = {
  id: string;
  cost_code_id: string;
  cost_type_id: string;
  description: string | null;
  original_amount: number;
  cost_codes?: { title: string | null } | { title: string | null }[] | null;
  cost_code_types?:
    | { code: string | null; description: string | null }
    | { code: string | null; description: string | null }[]
    | null;
};

const ParamsSchema = z.object({
  projectId: z.string().regex(/^\d+$/, "Project ID must be numeric"),
  commitmentId: z.string().min(1),
});

const ImportSourceSchema = z.object({
  source: z.literal("budget"),
  lineItemIds: z.array(z.string()).optional(),
});

const getRelationValue = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
};

export const POST = withApiGuardrails<
  Promise<{ projectId: string; commitmentId: string }>
>(
  "/api/projects/[projectId]/commitments/[commitmentId]/line-items/import#POST",
  async ({ request, params }) => {
    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "/api/projects/[projectId]/commitments/[commitmentId]/line-items/import#POST",
        message: "Invalid path parameters.",
        details: parsedParams.error.issues.map((issue) => issue.message),
      });
    }

    const { projectId, commitmentId } = parsedParams.data;
    const numericProjectId = Number.parseInt(projectId, 10);
    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) {
      return authResult;
    }
    const supabase = authResult.serviceClient;

    const guard = await requirePermission(numericProjectId, "contracts", "write");
    if (guard.denied) {
      return guard.response;
    }

    const parsedBody = ImportSourceSchema.safeParse(await request.json().catch(() => null));
    if (!parsedBody.success) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "/api/projects/[projectId]/commitments/[commitmentId]/line-items/import#POST",
        message: "Invalid import payload.",
        details: parsedBody.error.issues.map((issue) => issue.message),
      });
    }
    const body = parsedBody.data;

    const { data: commitment, error: commitmentError } = await (supabase as any)
      .from("commitments_unified")
      .select("id, project_id, commitment_type")
      .eq("id", commitmentId)
      .eq("project_id", numericProjectId)
      .single();

    if (commitmentError || !commitment) {
      throw new GuardrailError({
        code: "ROUTE_BINDING_MISSING",
        where: "/api/projects/[projectId]/commitments/[commitmentId]/line-items/import#POST",
        message: "Commitment not found.",
        status: 404,
        severity: "low",
      });
    }

    const commitmentType = commitment.commitment_type as string;
    const isSubcontract = commitmentType === "subcontract";
    const sovTable = isSubcontract ? "subcontract_sov_items" : "purchase_order_sov_items";
    const fkColumn = isSubcontract ? "subcontract_id" : "purchase_order_id";

    let budgetQuery = supabase
      .from("budget_lines")
      .select(
        `
        id,
        cost_code_id,
        cost_type_id,
        description,
        original_amount,
        cost_codes ( title ),
        cost_code_types ( code, description )
      `,
      )
      .eq("project_id", numericProjectId)
      .order("cost_code_id", { ascending: true });

    if (body.lineItemIds && body.lineItemIds.length > 0) {
      budgetQuery = budgetQuery.in("id", body.lineItemIds);
    }

    const { data: budgetLines, error: budgetError } = await budgetQuery;
    if (budgetError) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "/api/projects/[projectId]/commitments/[commitmentId]/line-items/import#POST",
        message: "Failed to fetch budget lines.",
        details: { reason: budgetError.message, projectId: numericProjectId },
        cause: budgetError,
      });
    }

    if (!budgetLines || budgetLines.length === 0) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "/api/projects/[projectId]/commitments/[commitmentId]/line-items/import#POST",
        message: "No budget lines found to import.",
        status: 400,
        severity: "low",
      });
    }

    if (budgetLines.length > 500) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "/api/projects/[projectId]/commitments/[commitmentId]/line-items/import#POST",
        message: "Maximum 500 line items allowed per import.",
        status: 400,
        severity: "low",
      });
    }

    const { data: existingLineItems } = await (supabase as any)
      .from(sovTable)
      .select("line_number")
      .eq(fkColumn, commitmentId)
      .order("line_number", { ascending: false })
      .limit(1);

    let nextLineNumber = 1;
    if (existingLineItems?.[0]?.line_number) {
      nextLineNumber = existingLineItems[0].line_number + 1;
    }

    const importedItems: unknown[] = [];
    const errors: string[] = [];
    const skipped: string[] = [];

    for (let i = 0; i < budgetLines.length; i++) {
      const budgetLine = budgetLines[i] as BudgetLine;
      const lineNumber = nextLineNumber + i;
      const costType = getRelationValue(budgetLine.cost_code_types);
      const costCode = getRelationValue(budgetLine.cost_codes);
      const costTypeCode = costType?.code || null;
      const budgetCode = costTypeCode
        ? `${budgetLine.cost_code_id}.${costTypeCode}`
        : budgetLine.cost_code_id;
      const baseDescription =
        budgetLine.description || costCode?.title || "Imported from budget";
      const typeSuffix = costType?.description ? ` - ${costType.description}` : "";
      const description = `${baseDescription}${typeSuffix}`;

      const lineItemData = {
        [fkColumn]: commitmentId,
        line_number: lineNumber,
        budget_code: budgetCode,
        description,
        amount: budgetLine.original_amount,
        billed_to_date: 0,
        sort_order: i,
      };

      const { data: insertedItem, error: insertError } = await (supabase as any)
        .from(sovTable)
        .insert(lineItemData)
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          skipped.push(`Line ${lineNumber}: Duplicate line number`);
        } else {
          errors.push(`Line ${lineNumber}: ${insertError.message}`);
        }
        continue;
      }

      importedItems.push(insertedItem);
    }

    return NextResponse.json({
      success: true,
      importedCount: importedItems.length,
      totalRows: budgetLines.length,
      skipped: skipped.length > 0 ? skipped : undefined,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${importedItems.length} of ${budgetLines.length} line items from budget.`,
    });
  },
);
