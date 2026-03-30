import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";

// Cost types that count towards Job to Date (all approved)
const JTD_COST_TYPES = [
  "Invoice",
  "Expense",
  "Payroll",
  "Subcontractor Invoice",
];

// Cost types that count towards Direct Costs (excludes Subcontractor Invoice)
const DIRECT_COST_TYPES = ["Invoice", "Expense", "Payroll"];
const APPROVED_DIRECT_COST_STATUSES = ["Approved", "Paid"];

// Pending commitment statuses for Pending Cost Changes calculation
const PENDING_SUBCONTRACT_STATUSES = ["Out for Signature", "Pending"];
const PENDING_PO_STATUSES = [
  "Draft",
  "Sent",
  "Acknowledged",
];

// Executed/Approved commitment statuses for Committed Costs calculation
const EXECUTED_SUBCONTRACT_STATUSES = ["Approved", "Complete"];
const EXECUTED_PO_STATUSES = ["Approved", "Completed"];

interface ExportBudgetRow {
  "Cost Code": string;
  "Cost Type": string;
  Description: string;
  "Unit Qty": number | string;
  UOM: string;
  "Unit Cost": number | string;
  "Original Budget": number;
  "Budget Modifications": number;
  "Approved Change Orders": number;
  "Revised Budget": number;
  "Job to Date Cost": number;
  "Direct Costs": number;
  "Pending Changes": number;
  "Committed Costs": number;
  "Forecast to Complete": number;
  "Estimated Cost at Completion": number;
  "Projected Over/Under": number;
}

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "excel";

    // Validate format
    if (!["excel", "csv"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be 'excel' or 'csv'" },
        { status: 400 },
      );
    }

    // Fetch budget data using the same logic as the main budget API
    const [
      budgetLinesRes,
      directCostsRes,
      subcontractSovRes,
      poSovRes,
      pendingPrimeChangeOrdersRes,
      executedSubcontractSovRes,
      executedPoSovRes,
      pendingCommitmentCOsRes,
      approvedCommitmentCOsRes,
    ] = await Promise.all([
      // Budget lines from materialized view
      supabase
        .from("v_budget_lines" as any)
        .select(
          `
          *,
          cost_code:cost_codes(id, title, division_id),
          cost_type:cost_code_types(code, description),
          sub_job:sub_jobs(code, name)
        `,
        )
        .eq("project_id", numericProjectId)
        .order("cost_code_id", { ascending: true }),

      // Direct costs for calculations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("direct_cost_line_items")
        .select(
          `
          budget_code_id,
          line_total,
          quantity,
          unit_cost,
          direct_costs!inner(
            cost_type,
            status,
            project_id
          )
        `,
        )
        .eq("direct_costs.project_id", numericProjectId)
        .in("direct_costs.status", APPROVED_DIRECT_COST_STATUSES) as Promise<{ data: Array<Record<string, unknown>> | null; error: unknown }>,

      // Subcontract SOV items with pending status for Pending Cost Changes
      supabase
        .from("subcontract_sov_items")
        .select("budget_code, amount, subcontracts!inner(status, project_id)")
        .eq("subcontracts.project_id", numericProjectId)
        .in("subcontracts.status", PENDING_SUBCONTRACT_STATUSES),

      // PO SOV items with pending statuses for Pending Cost Changes
      supabase
        .from("purchase_order_sov_items")
        .select(
          "budget_code, amount, purchase_orders!inner(status, project_id)",
        )
        .eq("purchase_orders.project_id", numericProjectId)
        .in("purchase_orders.status", PENDING_PO_STATUSES),

      // Pending change orders for Pending Budget Changes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("change_order_lines")
        .select("cost_code_id, amount, change_orders!inner(status, project_id)")
        .eq("change_orders.project_id", numericProjectId)
        .like("change_orders.status", "Pending%") as Promise<{ data: Array<Record<string, unknown>> | null; error: unknown }>,

      // Executed/Approved Subcontract SOV items for Committed Costs
      supabase
        .from("subcontract_sov_items")
        .select("budget_code, amount, subcontracts!inner(status, project_id)")
        .eq("subcontracts.project_id", numericProjectId)
        .in("subcontracts.status", EXECUTED_SUBCONTRACT_STATUSES),

      // Executed/Approved PO SOV items for Committed Costs
      supabase
        .from("purchase_order_sov_items")
        .select(
          "budget_code, amount, purchase_orders!inner(status, project_id)",
        )
        .eq("purchase_orders.project_id", numericProjectId)
        .in("purchase_orders.status", EXECUTED_PO_STATUSES),

      // Pending commitment change orders for Pending Cost Changes
      supabase
        .from("commitment_change_order_lines")
        .select(
          `
          cost_code_id,
          amount,
          commitment_change_orders!inner(
            status,
            commitments!inner(project_id)
          )
        `,
        )
        .eq("commitment_change_orders.commitments.project_id", numericProjectId)
        .like("commitment_change_orders.status", "Pending%"),

      // Approved commitment change orders for Committed Costs
      supabase
        .from("commitment_change_order_lines")
        .select(
          `
          cost_code_id,
          amount,
          commitment_change_orders!inner(
            status,
            commitments!inner(project_id)
          )
        `,
        )
        .eq("commitment_change_orders.commitments.project_id", numericProjectId)
        .eq("commitment_change_orders.status", "Approved"),
    ]);

    if (budgetLinesRes.error) {
      return NextResponse.json(
        { error: "Failed to fetch budget data for export" },
        { status: 500 },
      );
    }

    // Build cost aggregation by cost_code_id (simplified for export)
    const costsByCode: Record<string, {
      jobToDateCostDetail: number;
      directCosts: number;
      pendingCostChanges: number;
      committedCosts: number;
      pendingBudgetChanges: number;
    }> = {};

    // Process direct costs
    for (const cost of (directCostsRes.data || []) as unknown as Array<{
      budget_code_id: string | null;
      line_total: number | null;
      quantity: number | null;
      unit_cost: number | null;
      direct_costs: { cost_type: string | null; status: string | null } | null;
    }>) {
      const codeId = cost.budget_code_id;
      if (!codeId) continue;

      if (!costsByCode[codeId]) {
        costsByCode[codeId] = {
          jobToDateCostDetail: 0,
          directCosts: 0,
          pendingCostChanges: 0,
          committedCosts: 0,
          pendingBudgetChanges: 0,
        };
      }

      const costType = cost.direct_costs?.cost_type || "Invoice";
      const amount =
        cost.line_total ?? (cost.quantity ?? 0) * (cost.unit_cost ?? 0);

      if (JTD_COST_TYPES.includes(costType)) {
        costsByCode[codeId].jobToDateCostDetail += amount;
      }

      if (DIRECT_COST_TYPES.includes(costType)) {
        costsByCode[codeId].directCosts += amount;
      }
    }

    // Pending Cost Changes from Subcontracts
    for (const item of (subcontractSovRes.data || []) as Array<{
      budget_code: string | null;
      amount: number | null;
    }>) {
      const codeId = item.budget_code;
      if (!codeId) continue;
      if (!costsByCode[codeId]) {
        costsByCode[codeId] = {
          jobToDateCostDetail: 0,
          directCosts: 0,
          pendingCostChanges: 0,
          committedCosts: 0,
          pendingBudgetChanges: 0,
        };
      }
      costsByCode[codeId].pendingCostChanges += item.amount || 0;
    }

    // Pending Cost Changes from Purchase Orders
    for (const item of (poSovRes.data || []) as Array<{
      budget_code: string | null;
      amount: number | null;
    }>) {
      const codeId = item.budget_code;
      if (!codeId) continue;
      if (!costsByCode[codeId]) {
        costsByCode[codeId] = {
          jobToDateCostDetail: 0,
          directCosts: 0,
          pendingCostChanges: 0,
          committedCosts: 0,
          pendingBudgetChanges: 0,
        };
      }
      costsByCode[codeId].pendingCostChanges += item.amount || 0;
    }

    // Pending Budget Changes from Prime Contract Change Orders
    for (const item of (pendingPrimeChangeOrdersRes.data || []) as Array<{
      cost_code_id: string | null;
      amount: number | null;
    }>) {
      const codeId = item.cost_code_id;
      if (!codeId) continue;
      if (!costsByCode[codeId]) {
        costsByCode[codeId] = {
          jobToDateCostDetail: 0,
          directCosts: 0,
          pendingCostChanges: 0,
          committedCosts: 0,
          pendingBudgetChanges: 0,
        };
      }
      costsByCode[codeId].pendingBudgetChanges += item.amount || 0;
    }

    // Pending Cost Changes from Commitment Change Orders
    for (const item of (pendingCommitmentCOsRes.data || []) as Array<{
      cost_code_id: string | null;
      amount: number | null;
    }>) {
      const codeId = item.cost_code_id;
      if (!codeId) continue;
      if (!costsByCode[codeId]) {
        costsByCode[codeId] = {
          jobToDateCostDetail: 0,
          directCosts: 0,
          pendingCostChanges: 0,
          committedCosts: 0,
          pendingBudgetChanges: 0,
        };
      }
      costsByCode[codeId].pendingCostChanges += item.amount || 0;
    }

    // Committed Costs from Executed Subcontracts
    for (const item of (executedSubcontractSovRes.data || []) as Array<{
      budget_code: string | null;
      amount: number | null;
    }>) {
      const codeId = item.budget_code;
      if (!codeId) continue;
      if (!costsByCode[codeId]) {
        costsByCode[codeId] = {
          jobToDateCostDetail: 0,
          directCosts: 0,
          pendingCostChanges: 0,
          committedCosts: 0,
          pendingBudgetChanges: 0,
        };
      }
      costsByCode[codeId].committedCosts += item.amount || 0;
    }

    // Committed Costs from Executed Purchase Orders
    for (const item of (executedPoSovRes.data || []) as Array<{
      budget_code: string | null;
      amount: number | null;
    }>) {
      const codeId = item.budget_code;
      if (!codeId) continue;
      if (!costsByCode[codeId]) {
        costsByCode[codeId] = {
          jobToDateCostDetail: 0,
          directCosts: 0,
          pendingCostChanges: 0,
          committedCosts: 0,
          pendingBudgetChanges: 0,
        };
      }
      costsByCode[codeId].committedCosts += item.amount || 0;
    }

    // Committed Costs from Approved Commitment Change Orders
    for (const item of (approvedCommitmentCOsRes.data || []) as Array<{
      cost_code_id: string | null;
      amount: number | null;
    }>) {
      const codeId = item.cost_code_id;
      if (!codeId) continue;
      if (!costsByCode[codeId]) {
        costsByCode[codeId] = {
          jobToDateCostDetail: 0,
          directCosts: 0,
          pendingCostChanges: 0,
          committedCosts: 0,
          pendingBudgetChanges: 0,
        };
      }
      costsByCode[codeId].committedCosts += item.amount || 0;
    }

    // Transform to export format
    const exportData: ExportBudgetRow[] = ((budgetLinesRes.data || []) as unknown as Record<string, unknown>[]).map(
      (item: Record<string, unknown>) => {
        const costCode = item.cost_code as
          | { id?: string; title?: string; division_id?: string }
          | undefined;
        const costType = item.cost_type as
          | { code?: string; description?: string }
          | undefined;
        const costCodeId = item.cost_code_id as string;

        // Get cost data for this line item
        const costData = costsByCode[costCodeId] || {
          jobToDateCostDetail: 0,
          directCosts: 0,
          pendingCostChanges: 0,
          committedCosts: 0,
          pendingBudgetChanges: 0,
        };

        // Core budget values
        const originalBudgetAmount = parseFloat(item.original_amount as string) || 0;
        const budgetModifications = parseFloat(item.budget_mod_total as string) || 0;
        const approvedCOs = parseFloat(item.approved_co_total as string) || 0;
        const revisedBudget = parseFloat(item.revised_budget as string) || 0;

        // Calculated fields
        const projectedBudget = revisedBudget + costData.pendingBudgetChanges;
        const projectedCosts =
          costData.directCosts +
          costData.committedCosts +
          costData.pendingCostChanges;
        const forecastToComplete = Math.max(0, projectedBudget - projectedCosts);
        const estimatedCostAtCompletion = projectedCosts + forecastToComplete;
        const projectedOverUnder = projectedBudget - estimatedCostAtCompletion;

        return {
          "Cost Code": costCodeId,
          "Cost Type": costType?.code || "",
          "Description": (item.description as string) ||
            `${costCodeId} - ${costCode?.title || ""} ${costType?.code ? `(${costType.code})` : ""}`,
          "Unit Qty": item.quantity ? parseFloat(item.quantity as string) : "",
          "UOM": (item.unit_of_measure as string) || "",
          "Unit Cost": item.unit_cost ? parseFloat(item.unit_cost as string) : "",
          "Original Budget": originalBudgetAmount,
          "Budget Modifications": budgetModifications,
          "Approved Change Orders": approvedCOs,
          "Revised Budget": revisedBudget,
          "Job to Date Cost": costData.jobToDateCostDetail,
          "Direct Costs": costData.directCosts,
          "Pending Changes": costData.pendingBudgetChanges,
          "Committed Costs": costData.committedCosts,
          "Forecast to Complete": forecastToComplete,
          "Estimated Cost at Completion": estimatedCostAtCompletion,
          "Projected Over/Under": projectedOverUnder,
        };
      },
    );

    // Get project name for filename
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", numericProjectId)
      .single();

    const projectName = project?.name || `Project-${projectId}`;
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${projectName}-Budget-${timestamp}`;

    if (format === "csv") {
      // Generate CSV
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(worksheet);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      // Generate Excel
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths for better readability
      const columnWidths = [
        { wch: 12 }, // Cost Code
        { wch: 10 }, // Cost Type
        { wch: 30 }, // Description
        { wch: 10 }, // Unit Qty
        { wch: 8 },  // UOM
        { wch: 12 }, // Unit Cost
        { wch: 15 }, // Original Budget
        { wch: 18 }, // Budget Modifications
        { wch: 20 }, // Approved Change Orders
        { wch: 15 }, // Revised Budget
        { wch: 16 }, // Job to Date Cost
        { wch: 12 }, // Direct Costs
        { wch: 15 }, // Pending Changes
        { wch: 15 }, // Committed Costs
        { wch: 18 }, // Forecast to Complete
        { wch: 22 }, // Estimated Cost at Completion
        { wch: 18 }, // Projected Over/Under
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Budget Line Items");

      // Add a summary sheet with grand totals
      const grandTotals = exportData.reduce(
        (totals, item) => ({
          "Total Original Budget": totals["Total Original Budget"] + (typeof item["Original Budget"] === 'number' ? item["Original Budget"] : 0),
          "Total Budget Modifications": totals["Total Budget Modifications"] + (typeof item["Budget Modifications"] === 'number' ? item["Budget Modifications"] : 0),
          "Total Approved Change Orders": totals["Total Approved Change Orders"] + (typeof item["Approved Change Orders"] === 'number' ? item["Approved Change Orders"] : 0),
          "Total Revised Budget": totals["Total Revised Budget"] + (typeof item["Revised Budget"] === 'number' ? item["Revised Budget"] : 0),
          "Total Job to Date Cost": totals["Total Job to Date Cost"] + (typeof item["Job to Date Cost"] === 'number' ? item["Job to Date Cost"] : 0),
          "Total Direct Costs": totals["Total Direct Costs"] + (typeof item["Direct Costs"] === 'number' ? item["Direct Costs"] : 0),
          "Total Pending Changes": totals["Total Pending Changes"] + (typeof item["Pending Changes"] === 'number' ? item["Pending Changes"] : 0),
          "Total Committed Costs": totals["Total Committed Costs"] + (typeof item["Committed Costs"] === 'number' ? item["Committed Costs"] : 0),
          "Total Forecast to Complete": totals["Total Forecast to Complete"] + (typeof item["Forecast to Complete"] === 'number' ? item["Forecast to Complete"] : 0),
          "Total Estimated Cost at Completion": totals["Total Estimated Cost at Completion"] + (typeof item["Estimated Cost at Completion"] === 'number' ? item["Estimated Cost at Completion"] : 0),
          "Total Projected Over/Under": totals["Total Projected Over/Under"] + (typeof item["Projected Over/Under"] === 'number' ? item["Projected Over/Under"] : 0),
        }),
        {
          "Total Original Budget": 0,
          "Total Budget Modifications": 0,
          "Total Approved Change Orders": 0,
          "Total Revised Budget": 0,
          "Total Job to Date Cost": 0,
          "Total Direct Costs": 0,
          "Total Pending Changes": 0,
          "Total Committed Costs": 0,
          "Total Forecast to Complete": 0,
          "Total Estimated Cost at Completion": 0,
          "Total Projected Over/Under": 0,
        }
      );

      const summaryData = [
        { Field: "Line Items Count", Value: exportData.length },
        { Field: "Export Date", Value: new Date().toLocaleDateString() },
        { Field: "", Value: "" }, // Empty row
        ...Object.entries(grandTotals).map(([field, value]) => ({
          Field: field,
          Value: typeof value === 'number' ? value.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
          }) : value
        }))
      ];

      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      summaryWorksheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(excelBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to export budget",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
