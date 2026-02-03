/**
 * =============================================================================
 * COMMITMENT EXPORT API ENDPOINT
 * =============================================================================
 *
 * Export commitment data to CSV, Excel, or PDF format
 * Supports various templates and options for SOV, change orders, and invoices
 */

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";

interface ExportParams {
  format: "csv" | "excel" | "pdf";
  template: "standard" | "financial" | "summary";
  include_sov_items: boolean;
  include_change_orders: boolean;
  include_invoices: boolean;
}

interface SovItem {
  id: string;
  line_number: number | null;
  description: string | null;
  budget_code: string | null;
  amount: number | null;
  billed_to_date: number | null;
}

interface CommitmentData {
  id: string;
  number: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  original_amount: number;
  approved_change_orders: number;
  revised_contract_amount: number;
  billed_to_date: number;
  balance_to_finish: number;
  retention_percentage: number | null;
  start_date: string | null;
  executed_date: string | null;
  substantial_completion_date: string | null;
  accounting_method: string | null;
  contract_company: {
    name: string;
  } | null;
  line_items: SovItem[];
  created_at: string;
  updated_at: string;
}

// =============================================================================
// POST - Export Commitment
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const exportParams: ExportParams = {
      format: body.format || "pdf",
      template: body.template || "standard",
      include_sov_items: body.include_sov_items !== false,
      include_change_orders: body.include_change_orders !== false,
      include_invoices: body.include_invoices === true,
    };

    // Fetch commitment data
    const commitmentData = await fetchCommitmentData(supabase, id);
    if (!commitmentData) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 }
      );
    }

    // Generate export based on format
    const baseFilename = `commitment-${commitmentData.number || id}`;
    const dateStr = new Date().toISOString().split("T")[0];

    if (exportParams.format === "csv") {
      const csv = generateCSV(commitmentData, exportParams);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseFilename}-${dateStr}.csv"`,
        },
      });
    } else if (exportParams.format === "excel") {
      const excelBuffer = generateExcel(commitmentData, exportParams);
      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${baseFilename}-${dateStr}.xlsx"`,
        },
      });
    } else if (exportParams.format === "pdf") {
      const html = generatePDFHTML(commitmentData, exportParams);
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${baseFilename}-${dateStr}.html"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Unsupported export format" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      {
        error: "Failed to export commitment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function fetchCommitmentData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
): Promise<CommitmentData | null> {
  // Determine type from unified view
  const { data: unifiedData, error: unifiedError } = await supabase
    .from("commitments_unified")
    .select("commitment_type")
    .eq("id", id)
    .single();

  if (unifiedError || !unifiedData) {
    return null;
  }

  const isSubcontract = unifiedData.commitment_type === "subcontract";
  const tableName = isSubcontract ? "subcontracts" : "purchase_orders";
  const sovTableName = isSubcontract
    ? "subcontract_sov_items"
    : "purchase_order_sov_items";
  const sovFkColumn = isSubcontract ? "subcontract_id" : "purchase_order_id";
  const totalsViewName = isSubcontract
    ? "subcontracts_with_totals"
    : "purchase_orders_with_totals";

  // Fetch base record with company join
  const { data, error } = await supabase
    .from(tableName)
    .select(
      `
      *,
      contract_company:companies!contract_company_id(name)
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  // Fetch financial totals
  const { data: totalsData } = await (supabase as any)
    .from(totalsViewName)
    .select(
      "total_sov_amount, total_billed_to_date, total_amount_remaining, sov_line_count"
    )
    .eq("id", id)
    .single();

  // Fetch SOV line items
  const { data: sovItems } = await (supabase as any)
    .from(sovTableName)
    .select("*")
    .eq(sovFkColumn, id)
    .order("line_number", { ascending: true });

  const originalAmount = Number(totalsData?.total_sov_amount) || 0;
  const billedToDate = Number(totalsData?.total_billed_to_date) || 0;
  const balanceToFinish = Number(totalsData?.total_amount_remaining) || 0;

  return {
    id: data.id,
    number: data.number,
    title: data.title,
    description: data.description,
    status: data.status,
    type: unifiedData.commitment_type,
    original_amount: originalAmount,
    approved_change_orders: 0,
    revised_contract_amount: originalAmount,
    billed_to_date: billedToDate,
    balance_to_finish: balanceToFinish,
    retention_percentage: data.default_retainage,
    start_date: data.start_date,
    executed_date: data.executed_date,
    substantial_completion_date: data.substantial_completion_date,
    accounting_method: data.accounting_method,
    contract_company: data.contract_company,
    line_items: (sovItems || []).map((item: any) => ({
      id: item.id,
      line_number: item.line_number,
      description: item.description,
      budget_code: item.budget_code,
      amount: item.amount,
      billed_to_date: item.billed_to_date || 0,
    })),
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

// =============================================================================
// CSV GENERATION
// =============================================================================

function generateCSV(data: CommitmentData, params: ExportParams): string {
  const rows: string[][] = [];

  // Header info
  rows.push(["Commitment Export"]);
  rows.push([`Number: ${data.number}`]);
  rows.push([`Title: ${data.title}`]);
  rows.push([`Company: ${data.contract_company?.name || "N/A"}`]);
  rows.push([`Status: ${data.status}`]);
  rows.push([`Type: ${data.type}`]);
  rows.push([]);

  // Financial Summary
  if (params.template !== "summary") {
    rows.push(["Financial Summary"]);
    rows.push(["Field", "Amount"]);
    rows.push(["Original Contract Amount", formatCurrency(data.original_amount)]);
    rows.push(["Approved Change Orders", formatCurrency(data.approved_change_orders)]);
    rows.push(["Revised Contract Amount", formatCurrency(data.revised_contract_amount)]);
    rows.push(["Billed to Date", formatCurrency(data.billed_to_date)]);
    rows.push(["Balance to Finish", formatCurrency(data.balance_to_finish)]);
    if (data.retention_percentage) {
      rows.push(["Retention %", `${data.retention_percentage}%`]);
    }
    rows.push([]);
  }

  // SOV Line Items
  if (params.include_sov_items && data.line_items.length > 0) {
    rows.push(["Schedule of Values"]);
    rows.push(["Line #", "Description", "Budget Code", "Amount", "Billed to Date", "Remaining"]);

    for (const item of data.line_items) {
      const amount = item.amount || 0;
      const billed = item.billed_to_date || 0;
      rows.push([
        String(item.line_number || ""),
        item.description || "",
        item.budget_code || "",
        formatCurrency(amount),
        formatCurrency(billed),
        formatCurrency(amount - billed),
      ]);
    }
    rows.push([]);
  }

  // Key Dates
  rows.push(["Key Dates"]);
  rows.push(["Date Type", "Date"]);
  if (data.start_date) rows.push(["Start Date", formatDate(data.start_date)]);
  if (data.executed_date) rows.push(["Executed Date", formatDate(data.executed_date)]);
  if (data.substantial_completion_date)
    rows.push(["Substantial Completion", formatDate(data.substantial_completion_date)]);

  return rows.map((row) => row.map((cell) => escapeCSVCell(cell)).join(",")).join("\n");
}

// =============================================================================
// EXCEL GENERATION
// =============================================================================

function generateExcel(data: CommitmentData, params: ExportParams): ArrayBuffer {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData: (string | number)[][] = [
    ["Commitment Details"],
    [],
    ["Field", "Value"],
    ["Number", data.number],
    ["Title", data.title],
    ["Company", data.contract_company?.name || "N/A"],
    ["Status", data.status],
    ["Type", data.type],
    [],
    ["Financial Summary"],
    [],
    ["Original Contract Amount", data.original_amount],
    ["Approved Change Orders", data.approved_change_orders],
    ["Revised Contract Amount", data.revised_contract_amount],
    ["Billed to Date", data.billed_to_date],
    ["Balance to Finish", data.balance_to_finish],
  ];

  if (data.retention_percentage) {
    summaryData.push(["Retention %", data.retention_percentage]);
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 25 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // SOV Sheet
  if (params.include_sov_items && data.line_items.length > 0) {
    const sovData: (string | number)[][] = [
      ["Line #", "Description", "Budget Code", "Amount", "Billed to Date", "Remaining"],
    ];

    for (const item of data.line_items) {
      const amount = item.amount || 0;
      const billed = item.billed_to_date || 0;
      sovData.push([
        item.line_number || "",
        item.description || "",
        item.budget_code || "",
        amount,
        billed,
        amount - billed,
      ]);
    }

    // Add totals row
    const totalAmount = data.line_items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalBilled = data.line_items.reduce((sum, item) => sum + (item.billed_to_date || 0), 0);
    sovData.push([]);
    sovData.push(["", "TOTAL", "", totalAmount, totalBilled, totalAmount - totalBilled]);

    const sovSheet = XLSX.utils.aoa_to_sheet(sovData);
    sovSheet["!cols"] = [
      { wch: 10 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, sovSheet, "Schedule of Values");
  }

  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

// =============================================================================
// PDF/HTML GENERATION
// =============================================================================

function generatePDFHTML(data: CommitmentData, params: ExportParams): string {
  let sovTableHTML = "";
  if (params.include_sov_items && data.line_items.length > 0) {
    const sovRows = data.line_items
      .map((item) => {
        const amount = item.amount || 0;
        const billed = item.billed_to_date || 0;
        return `
        <tr>
          <td>${item.line_number || "-"}</td>
          <td>${escapeHTML(item.description || "")}</td>
          <td>${escapeHTML(item.budget_code || "")}</td>
          <td class="amount">${formatCurrency(amount)}</td>
          <td class="amount">${formatCurrency(billed)}</td>
          <td class="amount">${formatCurrency(amount - billed)}</td>
        </tr>
      `;
      })
      .join("");

    const totalAmount = data.line_items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalBilled = data.line_items.reduce((sum, item) => sum + (item.billed_to_date || 0), 0);

    sovTableHTML = `
      <h2>Schedule of Values</h2>
      <table>
        <thead>
          <tr>
            <th>Line #</th>
            <th>Description</th>
            <th>Budget Code</th>
            <th class="amount">Amount</th>
            <th class="amount">Billed</th>
            <th class="amount">Remaining</th>
          </tr>
        </thead>
        <tbody>
          ${sovRows}
        </tbody>
        <tfoot>
          <tr class="totals">
            <td colspan="3"><strong>TOTAL</strong></td>
            <td class="amount"><strong>${formatCurrency(totalAmount)}</strong></td>
            <td class="amount"><strong>${formatCurrency(totalBilled)}</strong></td>
            <td class="amount"><strong>${formatCurrency(totalAmount - totalBilled)}</strong></td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Commitment ${escapeHTML(data.number)} - ${escapeHTML(data.title)}</title>
  <style>
    @media print {
      @page {
        margin: 0.5in;
        size: letter;
      }
      .no-print { display: none; }
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #2563eb;
    }
    .header h1 {
      font-size: 24pt;
      margin: 0 0 4px 0;
      color: #1e40af;
    }
    .header .commitment-number {
      font-size: 14pt;
      color: #64748b;
      margin: 0;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 10pt;
      font-weight: 600;
      text-transform: uppercase;
      background: #dbeafe;
      color: #1e40af;
    }
    .section {
      margin-bottom: 24px;
    }
    h2 {
      font-size: 14pt;
      color: #1e40af;
      margin: 0 0 12px 0;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .info-item {
      padding: 8px 0;
    }
    .info-item label {
      display: block;
      font-size: 9pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .info-item .value {
      font-size: 11pt;
      font-weight: 500;
    }
    .financial-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .financial-item {
      text-align: center;
    }
    .financial-item label {
      display: block;
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 4px;
    }
    .financial-item .value {
      font-size: 16pt;
      font-weight: 600;
      color: #1e40af;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .amount {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    tr:nth-child(even) {
      background-color: #fafafa;
    }
    .totals {
      background-color: #f1f5f9 !important;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 9pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    .print-instructions {
      background: #fef3c7;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 10pt;
    }
  </style>
</head>
<body>
  <div class="print-instructions no-print">
    <strong>To save as PDF:</strong> Press Ctrl+P (Windows) or Cmd+P (Mac) and select "Save as PDF" as the destination.
  </div>

  <div class="header">
    <div>
      <h1>${escapeHTML(data.title)}</h1>
      <p class="commitment-number">${escapeHTML(data.number)} | ${escapeHTML(data.type)}</p>
    </div>
    <span class="status-badge">${escapeHTML(data.status)}</span>
  </div>

  <div class="section">
    <div class="info-grid">
      <div class="info-item">
        <label>Contractor</label>
        <div class="value">${escapeHTML(data.contract_company?.name || "N/A")}</div>
      </div>
      <div class="info-item">
        <label>Accounting Method</label>
        <div class="value">${escapeHTML(data.accounting_method || "Amount Based")}</div>
      </div>
      <div class="info-item">
        <label>Start Date</label>
        <div class="value">${data.start_date ? formatDate(data.start_date) : "Not set"}</div>
      </div>
      <div class="info-item">
        <label>Executed Date</label>
        <div class="value">${data.executed_date ? formatDate(data.executed_date) : "Not set"}</div>
      </div>
    </div>
  </div>

  <h2>Financial Summary</h2>
  <div class="financial-summary">
    <div class="financial-item">
      <label>Original Contract</label>
      <div class="value">${formatCurrency(data.original_amount)}</div>
    </div>
    <div class="financial-item">
      <label>Approved Changes</label>
      <div class="value">${formatCurrency(data.approved_change_orders)}</div>
    </div>
    <div class="financial-item">
      <label>Revised Contract</label>
      <div class="value">${formatCurrency(data.revised_contract_amount)}</div>
    </div>
    <div class="financial-item">
      <label>Billed to Date</label>
      <div class="value">${formatCurrency(data.billed_to_date)}</div>
    </div>
    <div class="financial-item">
      <label>Balance to Finish</label>
      <div class="value">${formatCurrency(data.balance_to_finish)}</div>
    </div>
    <div class="financial-item">
      <label>Retention</label>
      <div class="value">${data.retention_percentage ? `${data.retention_percentage}%` : "N/A"}</div>
    </div>
  </div>

  ${sovTableHTML}

  ${
    data.description
      ? `
  <div class="section">
    <h2>Description</h2>
    <p>${escapeHTML(data.description)}</p>
  </div>
  `
      : ""
  }

  <div class="footer">
    <span>Generated: ${new Date().toLocaleString()}</span>
    <span>Alleato Project Management</span>
  </div>

  <script>
    window.onload = function() {
      // Auto-trigger print dialog for PDF export
      window.print();
    };
  </script>
</body>
</html>`;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | null): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function escapeCSVCell(cell: string): string {
  if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
