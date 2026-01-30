import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";

interface BudgetRow {
  "Cost Code": string;
  "Cost Type": string;
  Description?: string;
  "Unit Qty": number | string;
  UOM: string;
  "Unit Cost": number | string;
  "Budget Amount": number;
  // Support alternative column names for flexibility
  "Original Budget"?: number;
}

interface ImportResult {
  success: boolean;
  importedCount: number;
  totalRows: number;
  errors?: string[];
  warnings?: string[];
  message: string;
  skippedRows?: number;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
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

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type - support both Excel and CSV
    const isExcel = file.name.endsWith(".xlsx") ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const isCsv = file.name.endsWith(".csv") ||
      file.type === "text/csv" ||
      file.type === "application/csv";

    if (!isExcel && !isCsv) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an Excel (.xlsx) or CSV (.csv) file" },
        { status: 400 },
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse file based on type
    let rows: BudgetRow[];

    if (isCsv) {
      // Parse CSV file
      const csvText = buffer.toString('utf-8');
      const workbook = XLSX.read(csvText, { type: "string" });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      rows = XLSX.utils.sheet_to_json<BudgetRow>(worksheet, { defval: "" });
    } else {
      // Parse Excel file
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      rows = XLSX.utils.sheet_to_json<BudgetRow>(worksheet, { defval: "" });
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No data found in uploaded file" },
        { status: 400 },
      );
    }

    // Validate row limit
    if (rows.length > 1000) {
      return NextResponse.json(
        { error: "Maximum 1000 line items allowed per import" },
        { status: 400 },
      );
    }

    // Validate required columns exist
    const sampleRow = rows[0];
    const requiredColumns = ["Cost Code", "Cost Type"];
    const missingColumns = requiredColumns.filter(col => !(col in sampleRow));

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingColumns.join(", ")}`,
          details: "Required columns are: Cost Code, Cost Type. Optional: Description, Unit Qty, UOM, Unit Cost, Budget Amount (or Original Budget)"
        },
        { status: 400 },
      );
    }

    // Track imported items
    const importedItems: unknown[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let skippedRows = 0;

    // Helper function to get budget amount from multiple possible column names
    const getBudgetAmount = (row: BudgetRow): number => {
      return row["Budget Amount"] || row["Original Budget"] || 0;
    };

    // Helper function to parse numeric values
    const parseNumeric = (value: number | string | undefined): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const cleaned = value.replace(/[,$]/g, ''); // Remove commas and dollar signs
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because Excel is 1-indexed and has header row

      try {
        // Skip empty rows
        if (!row["Cost Code"] && !row["Cost Type"] && !getBudgetAmount(row)) {
          skippedRows++;
          warnings.push(`Row ${rowNum}: Skipped empty row`);
          continue;
        }

        // Validate required fields
        if (!row["Cost Code"] || String(row["Cost Code"]).trim() === "") {
          errors.push(`Row ${rowNum}: Cost Code is required`);
          continue;
        }

        if (!row["Cost Type"] || String(row["Cost Type"]).trim() === "") {
          errors.push(`Row ${rowNum}: Cost Type is required`);
          continue;
        }

        // Validate cost type is valid
        const validCostTypes = ["R", "E", "X", "L", "M", "S", "O"];
        if (!validCostTypes.includes(row["Cost Type"])) {
          errors.push(
            `Row ${rowNum}: Invalid Cost Type "${row["Cost Type"]}". Must be one of: ${validCostTypes.join(", ")}`,
          );
          continue;
        }

        // Look up the cost_type_id UUID from the code
        const { data: costType, error: costTypeError } = await supabase
          .from("cost_code_types")
          .select("id")
          .eq("code", row["Cost Type"])
          .single();

        if (costTypeError || !costType) {
          errors.push(
            `Row ${rowNum}: Cost Type "${row["Cost Type"]}" not found`,
          );
          continue;
        }

        // Find or validate the cost code exists for this project
        const { data: projectCostCode, error: costCodeError } = await supabase
          .from("project_budget_codes")
          .select("id, cost_code_id, cost_type_id")
          .eq("project_id", numericProjectId)
          .eq("cost_code_id", row["Cost Code"])
          .eq("cost_type_id", costType.id)
          .eq("is_active", true)
          .single();

        if (costCodeError || !projectCostCode) {
          errors.push(
            `Row ${rowNum}: Cost code "${row["Cost Code"]}" with type "${row["Cost Type"]}" not found in project budget codes`,
          );
          continue;
        }

        // Parse numeric fields with validation
        const budgetAmount = parseNumeric(getBudgetAmount(row));
        const unitQty = parseNumeric(row["Unit Qty"]);
        const unitCost = parseNumeric(row["Unit Cost"]);

        // Validate budget amount
        if (budgetAmount <= 0) {
          warnings.push(`Row ${rowNum}: Budget amount is ${budgetAmount}. Line item will be created but may need review.`);
        }

        // Prepare budget line item data
        const lineItemData = {
          project_id: numericProjectId,
          cost_code_id: String(row["Cost Code"]).trim(),
          cost_type_id: costType.id,
          description: row.Description ? String(row.Description).trim() : null,
          original_amount: budgetAmount,
          quantity: unitQty > 0 ? unitQty : null,
          unit_of_measure: row.UOM ? String(row.UOM).trim() : null,
          unit_cost: unitCost > 0 ? unitCost : null,
        };

        // Insert budget line item
        const { data: insertedItem, error: insertError } = await supabase
          .from("budget_lines")
          .insert(lineItemData)
          .select()
          .single();

        if (insertError) {
          errors.push(`Row ${rowNum}: ${insertError.message}`);
          continue;
        }

        importedItems.push(insertedItem);
      } catch (rowError) {
        errors.push(
          `Row ${rowNum}: ${rowError instanceof Error ? rowError.message : "Unknown error"}`,
        );
      }
    }

    // Return enhanced results
    const result: ImportResult = {
      success: true,
      importedCount: importedItems.length,
      totalRows: rows.length,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      skippedRows,
      message: `Successfully imported ${importedItems.length} of ${rows.length} line items`,
    };

    // Add summary to message if there were issues
    if (errors.length > 0 || warnings.length > 0 || skippedRows > 0) {
      const issues = [];
      if (errors.length > 0) issues.push(`${errors.length} errors`);
      if (warnings.length > 0) issues.push(`${warnings.length} warnings`);
      if (skippedRows > 0) issues.push(`${skippedRows} skipped rows`);

      result.message += `. Import completed with ${issues.join(", ")}.`;
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import budget",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
