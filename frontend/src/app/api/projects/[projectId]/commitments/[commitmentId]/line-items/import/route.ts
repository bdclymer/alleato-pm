import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; commitmentId: string }>;
}

interface ImportSource {
  source: "budget";
  lineItemIds?: string[];
}

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

const getRelationValue = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
};

/**
 * POST /api/projects/[projectId]/commitments/[commitmentId]/line-items/import
 *
 * Imports budget line items into a commitment's SOV (Schedule of Values).
 * Currently supports "budget" as the import source. Reads from the `budget_lines`
 * table, joining cost_codes and cost_code_types for descriptions, and creates
 * corresponding records in the `commitment_line_items` table.
 *
 * Line numbers are auto-assigned starting after the highest existing line number.
 * Maximum 500 line items per import operation.
 *
 * @route POST /api/projects/[projectId]/commitments/[commitmentId]/line-items/import
 * @param {string} projectId - Project ID (integer)
 * @param {string} commitmentId - Commitment UUID
 *
 * @requestBody {object}
 *   - source {string} (required) - Import source, currently only "budget" is supported
 *   - lineItemIds {string[]} [optional] - Specific budget line IDs to import.
 *     If omitted, all budget lines for the project are imported.
 *
 * @returns {object} 200 - {
 *     success: true,
 *     importedCount: number,
 *     totalRows: number,
 *     skipped?: string[],  // Duplicate line numbers
 *     errors?: string[],   // Insert errors
 *     message: string
 *   }
 * @returns {object} 400 - Invalid source, no budget lines found, or exceeds 500 limit
 * @returns {object} 401/403 - Unauthorized or insufficient project access
 * @returns {object} 404 - Commitment not found
 * @returns {object} 500 - Internal server error
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);

    if (Number.isNaN(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) return authResult;
    const supabase = authResult.serviceClient;

    const guard = await requirePermission(numericProjectId, "contracts", "write");
    if (guard.denied) return guard.response;

    const { data: commitment, error: commitmentError } = await (supabase as any)
      .from("commitments")
      .select("id, project_id")
      .eq("id", commitmentId)
      .eq("project_id", numericProjectId)
      .single();

    if (commitmentError || !commitment) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as ImportSource;

    if (body.source !== "budget") {
      return NextResponse.json(
        { error: 'Invalid import source. Only "budget" is supported.' },
        { status: 400 },
      );
    }

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
      return NextResponse.json(
        { error: "Failed to fetch budget lines", details: budgetError.message },
        { status: 400 },
      );
    }

    if (!budgetLines || budgetLines.length === 0) {
      return NextResponse.json(
        { error: "No budget lines found to import" },
        { status: 400 },
      );
    }

    if (budgetLines.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 line items allowed per import" },
        { status: 400 },
      );
    }

    const { data: existingLineItems } = await (supabase as any)
      .from("commitment_line_items")
      .select("line_number")
      .eq("commitment_id", commitmentId)
      .order("line_number", { ascending: false })
      .limit(1);

    let nextLineNumber = 1;
    if (
      existingLineItems &&
      existingLineItems.length > 0 &&
      existingLineItems[0]?.line_number
    ) {
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
      const typeSuffix = costType?.description ? ` – ${costType.description}` : "";
      const description = `${baseDescription}${typeSuffix}`;

      const lineItemData = {
        commitment_id: commitmentId,
        line_number: lineNumber,
        budget_code: budgetCode,
        description,
        amount: budgetLine.original_amount,
        billed_to_date: 0,
      };

      const { data: insertedItem, error: insertError } = await (supabase as any)
        .from("commitment_line_items")
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
      message: `Successfully imported ${importedItems.length} of ${budgetLines.length} line items from budget`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to import line items",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
