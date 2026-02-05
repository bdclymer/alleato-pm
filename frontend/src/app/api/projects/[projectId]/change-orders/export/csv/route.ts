import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const numericProjectId = Number(projectId);

    if (isNaN(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Support query params for filtering
    const status = searchParams.get("status");
    const contractType = searchParams.get("contractType");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const includeLineItems = searchParams.get("includeLineItems") === "true";

    // Build query - note: contract relations are fetched separately to avoid PostgREST relationship issues
    let query = supabase
      .from("change_orders")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("co_number", { ascending: true });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (contractType) {
      query = query.eq("contracts.contract_type", contractType);
    }

    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }

    if (dateTo) {
      query = query.lte("created_at", dateTo);
    }

    const { data: changeOrders, error } = await query;

    if (error) {
      return apiErrorResponse(error);
    }

    // Fetch contracts separately to avoid relationship lookup issues
    let contractsMap: Record<number, any> = {};
    if (changeOrders && changeOrders.length > 0) {
      const contractIds = [
        ...new Set(
          changeOrders
            .map((co) => co.contract_id)
            .filter((id): id is number => id !== null),
        ),
      ];

      if (contractIds.length > 0) {
        const { data: contracts } = await supabase
          .from("contracts")
          .select("id, contract_number, contract_name, contract_type")
          .in("id", contractIds);

        if (contracts) {
          contractsMap = contracts.reduce(
            (acc, contract) => {
              acc[contract.id] = contract;
              return acc;
            },
            {} as Record<number, any>,
          );
        }
      }
    }

    // Handle empty results
    if (!changeOrders || changeOrders.length === 0) {
      const emptyCSV = [
        "Number,Title,Status,Contract Type,Contract Company,Amount,Date Initiated,Due Date,Review Date,Designated Reviewer,Line Items Count,Created By,Created Date",
        "",
      ].join("\n");

      return new NextResponse(emptyCSV, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="change-orders-${projectId}-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Fetch line items if requested
    let lineItemsMap: Record<number, any[]> = {};
    if (includeLineItems) {
      const changeOrderIds = changeOrders.map((co) => co.id);
      const { data: lineItems } = await supabase
        .from("change_order_line_items")
        .select("*")
        .in("change_order_id", changeOrderIds)
        .order("sort_order", { ascending: true });

      if (lineItems) {
        lineItemsMap = lineItems.reduce(
          (acc, item) => {
            if (!acc[item.change_order_id]) {
              acc[item.change_order_id] = [];
            }
            acc[item.change_order_id].push(item);
            return acc;
          },
          {} as Record<number, any[]>,
        );
      }
    }

    // Generate CSV
    const csvRows: string[] = [];

    // Header row
    const headers = [
      "Number",
      "Title",
      "Status",
      "Contract Type",
      "Contract Company",
      "Amount",
      "Date Initiated",
      "Due Date",
      "Review Date",
      "Designated Reviewer",
      "Line Items Count",
      "Created By",
      "Created Date",
    ];
    csvRows.push(headers.join(","));

    // Data rows
    for (const co of changeOrders) {
      const contract = co.contract_id ? contractsMap[co.contract_id] : null;
      const contractType = contract?.contract_type || "";
      const contractName = contract?.contract_name || "";
      const designatedReviewer = co.designated_reviewer_id || "";
      const createdBy = co.submitted_by || "";
      const lineItemsCount = lineItemsMap[co.id]?.length || 0;

      const row = [
        escapeCSV(co.co_number || ""),
        escapeCSV(co.title || ""),
        escapeCSV(co.status || ""),
        escapeCSV(contractType),
        escapeCSV(contractName),
        co.amount?.toString() || "0",
        formatDate(co.submitted_at),
        formatDate(co.due_date),
        formatDate(co.approved_at),
        escapeCSV(designatedReviewer),
        lineItemsCount.toString(),
        escapeCSV(createdBy),
        formatDate(co.created_at),
      ];
      csvRows.push(row.join(","));

      // Add line item rows if requested
      if (includeLineItems && lineItemsMap[co.id]) {
        for (const item of lineItemsMap[co.id]) {
          const lineItemRow = [
            `  ${escapeCSV(item.cost_code || "")}`,
            escapeCSV(item.description || ""),
            "",
            "",
            "",
            item.total_price?.toString() || "0",
            "",
            "",
            "",
            "",
            `${item.quantity} ${item.unit || ""}`.trim(),
            "",
            "",
          ];
          csvRows.push(lineItemRow.join(","));
        }
      }
    }

    const csvContent = csvRows.join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="change-orders-${projectId}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * Escape CSV values that contain commas, quotes, or newlines
 */
function escapeCSV(value: string): string {
  if (!value) return "";

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Format date for CSV (YYYY-MM-DD)
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
}
