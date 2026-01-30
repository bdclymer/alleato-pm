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

    // Build query for budget lines
    let budgetQuery = supabase
      .from("budget_lines")
      .select("id, cost_code_id, cost_type_id, description, original_amount")
      .eq("project_id", numericProjectId)
      .order("cost_code_id", { ascending: true });

    // If specific line items requested, filter by IDs
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

    // Validate line item limit
    if (budgetLines.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 line items allowed per import" },
        { status: 400 },
      );
    }

    // Get existing line items to determine next line_number
    const { data: existingLineItems } = await supabase
      .from("contract_line_items")
      .select("line_number")
      .eq("contract_id", contractId)
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

    // Track imported items and errors
    const importedItems: unknown[] = [];
    const errors: string[] = [];
    const skipped: string[] = [];

    // Process each budget line
    for (let i = 0; i < budgetLines.length; i++) {
      const budgetLine = budgetLines[i];
      const lineNumber = nextLineNumber + i;

      try {
        // Get cost code details for description
        const { data: costCode } = await supabase
          .from("cost_codes")
          .select("title, id")
          .eq("id", budgetLine.cost_code_id)
          .single();

        const { data: costType } = await supabase
          .from("cost_code_types")
          .select("code, description")
          .eq("id", budgetLine.cost_type_id)
          .single();

        // Build description from cost code info and budget description
        let description = "";
        if (costCode && costType) {
          description = `${costCode.id} ${costType.code} - ${costCode.title}`;
          if (budgetLine.description) {
            description += ` - ${budgetLine.description}`;
          }
        } else {
          description = budgetLine.description || "Imported from budget";
        }

        // Prepare contract line item data
        // Since budget doesn't have quantity/unit cost, we'll use the original_amount
        // User can update these values after import
        const lineItemData = {
          contract_id: contractId,
          line_number: lineNumber,
          description: description,
          cost_code_id: parseInt(budgetLine.cost_code_id, 10),
          quantity: 1, // Default to 1
          unit_of_measure: "LS", // Default to lump sum
          unit_cost: budgetLine.original_amount, // Use budget amount as unit cost
        };

        // Insert contract line item
        const { data: insertedItem, error: insertError } = await supabase
          .from("contract_line_items")
          .insert(lineItemData)
          .select()
          .single();

        if (insertError) {
          if (insertError.code === "23505") {
            // Unique constraint violation
            skipped.push(`Line ${lineNumber}: Duplicate line number`);
          } else {
            errors.push(`Line ${lineNumber}: ${insertError.message}`);
          }
          continue;
        }

        importedItems.push(insertedItem);
      } catch (lineError) {
        errors.push(
          `Budget line ${budgetLine.id}: ${lineError instanceof Error ? lineError.message : "Unknown error"}`,
        );
      }
    }

    // Return results
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
