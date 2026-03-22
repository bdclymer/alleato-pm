import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string }>;
}

interface ImportSource {
  source: "budget";
  lineItemIds?: string[];
}

/**
 * POST /api/projects/[id]/contracts/[contractId]/line-items/import
 * Imports line items from budget into contract SOV
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId } = await params;
    const numericProjectId = parseInt(projectId, 10);

    if (Number.isNaN(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) return authResult;
    const supabase = authResult.serviceClient;

    // Verify contract exists and belongs to project
    const { data: contract, error: contractError } = await supabase
      .from("prime_contracts")
      .select("id, contract_number")
      .eq("id", contractId)
      .eq("project_id", numericProjectId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    // Parse request body
    const body = (await request.json()) as ImportSource;

    if (body.source !== "budget") {
      return NextResponse.json(
        { error: 'Invalid import source. Only "budget" is supported.' },
        { status: 400 },
      );
    }

    // Fetch budget lines with cost code info in a single query
    let budgetQuery = supabase
      .from("budget_lines")
      .select(
        `id, cost_code_id, cost_type_id, description, original_amount,
         cost_codes ( title ),
         cost_code_types ( code, description )`,
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

    // Get existing line items — used for dedup and next line number
    const { data: existingLineItems } = await supabase
      .from("contract_line_items")
      .select("cost_code_id, line_number")
      .eq("contract_id", contractId)
      .order("line_number", { ascending: false });

    const existingCostCodeIds = new Set(
      (existingLineItems || [])
        .map((item) => item.cost_code_id)
        .filter((id): id is string => id != null),
    );

    const maxLineNumber =
      existingLineItems && existingLineItems.length > 0
        ? (existingLineItems[0]?.line_number ?? 0)
        : 0;

    // Smart merge: skip items already in the contract
    const newBudgetLines = budgetLines.filter(
      (line) => !existingCostCodeIds.has((line as { cost_code_id: string }).cost_code_id),
    );
    const skippedCount = budgetLines.length - newBudgetLines.length;

    if (newBudgetLines.length === 0) {
      return NextResponse.json({
        success: true,
        importedCount: 0,
        skippedCount,
        totalRows: budgetLines.length,
        message: "All selected items are already in the schedule of values.",
      });
    }

    const importedItems: unknown[] = [];
    const errors: string[] = [];

    for (let i = 0; i < newBudgetLines.length; i++) {
      const budgetLine = newBudgetLines[i] as {
        id: string;
        cost_code_id: string;
        description: string | null;
        original_amount: number;
        cost_codes: { title: string | null } | { title: string | null }[] | null;
        cost_code_types:
          | { code: string | null; description: string | null }
          | { code: string | null; description: string | null }[]
          | null;
      };

      const costCode = Array.isArray(budgetLine.cost_codes)
        ? budgetLine.cost_codes[0]
        : budgetLine.cost_codes;
      const costType = Array.isArray(budgetLine.cost_code_types)
        ? budgetLine.cost_code_types[0]
        : budgetLine.cost_code_types;

      const description =
        budgetLine.description ||
        costCode?.title ||
        `Imported – ${budgetLine.cost_code_id}`;

      const lineNumber = maxLineNumber + i + 1;

      const { data: insertedItem, error: insertError } = await supabase
        .from("contract_line_items")
        .insert({
          contract_id: contractId,
          line_number: lineNumber,
          description,
          cost_code_id: budgetLine.cost_code_id,
          quantity: 1,
          unit_of_measure: "LS",
          unit_cost: budgetLine.original_amount,
          total_cost: budgetLine.original_amount,
        })
        .select("*")
        .single();

      if (insertError) {
        errors.push(`Line ${lineNumber}: ${insertError.message}`);
        continue;
      }

      importedItems.push({
        ...insertedItem,
        cost_code: costCode
          ? { id: budgetLine.cost_code_id, code: budgetLine.cost_code_id, name: costCode.title || "" }
          : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      importedCount: importedItems.length,
      skippedCount,
      totalRows: budgetLines.length,
      items: importedItems,
      errors: errors.length > 0 ? errors : undefined,
      message: `Imported ${importedItems.length} item${importedItems.length !== 1 ? "s" : ""}${skippedCount > 0 ? `, skipped ${skippedCount} already present` : ""}.`,
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
