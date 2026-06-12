import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import * as XLSX from "xlsx";
import { normalizeSubcontractStatus, mapFormToInsert } from "@/lib/db/subcontracts";
import { logger } from "@/lib/logger";

interface ImportRow {
  number: string;
  type: string;
  title: string;
  status: string;
  companyId: string;
  originalAmount: number;
  costCode: string | null;
  accountingMethod: string;
  description: string | null;
  retentionPercentage: number | null;
  startDate: string | null;
  estCompletionDate: string | null;
  contractDate: string | null;
  signedDate: string | null;
  actualCompletionDate: string | null;
  issuedOnDate: string | null;
  inclusions: string | null;
  exclusions: string | null;
}

const COLUMN_ALIASES: Record<keyof ImportRow, string[]> = {
  number: ["number", "commitment number", "contract number", "no", "#"],
  type: ["type", "commitment type"],
  title: ["title", "name"],
  status: ["status"],
  companyId: ["company id", "company_id", "vendor id", "contractor id"],
  originalAmount: ["original amount", "amount", "contract amount", "original contract amount"],
  costCode: ["cost code", "cost_code", "budget code", "budget_code", "csi code", "csi"],
  accountingMethod: ["accounting method", "accounting_method"],
  description: ["description", "desc"],
  retentionPercentage: ["retention percentage", "retainage", "retention", "retainage %", "retention %"],
  startDate: ["start date", "start_date"],
  estCompletionDate: ["est. completion date", "est completion date", "estimated completion date", "est_completion_date"],
  contractDate: ["contract date", "contract_date"],
  signedDate: ["signed date", "signed_date", "signed contract received date"],
  actualCompletionDate: ["actual completion date", "actual_completion_date"],
  issuedOnDate: ["issued on date", "issued_on_date", "issued on"],
  inclusions: ["inclusions"],
  exclusions: ["exclusions"],
};

function normalizeHeader(val: unknown): string {
  return String(val ?? "").trim().toLowerCase();
}

function getCellString(row: Record<string, unknown>, aliases: string[]): string {
  for (const alias of aliases) {
    const val = row[alias];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val).trim();
    }
  }
  return "";
}

function getCellNumber(row: Record<string, unknown>, aliases: string[]): number | null {
  const raw = getCellString(row, aliases);
  if (!raw) return null;
  const cleaned = raw.replace(/[$,%]/g, "").trim();
  const num = Number.parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
}

function parseDateCell(row: Record<string, unknown>, aliases: string[]): string | null {
  const raw = getCellString(row, aliases);
  if (!raw) return null;

  // Excel serial date number
  const num = Number(raw);
  if (!Number.isNaN(num) && num > 1000) {
    const date = XLSX.SSF.parse_date_code(num);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

  // MM/DD/YYYY
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const m = match[1].padStart(2, "0");
    const d = match[2].padStart(2, "0");
    return `${match[3]}-${m}-${d}`;
  }

  return null;
}

function parseRow(rawRow: Record<string, unknown>): ImportRow | null {
  const number = getCellString(rawRow, COLUMN_ALIASES.number);
  if (!number) return null;

  const amount = getCellNumber(rawRow, COLUMN_ALIASES.originalAmount);
  if (amount === null) return null;

  return {
    number,
    type: getCellString(rawRow, COLUMN_ALIASES.type) || "subcontract",
    title: getCellString(rawRow, COLUMN_ALIASES.title) || number,
    status: getCellString(rawRow, COLUMN_ALIASES.status) || "approved",
    companyId: getCellString(rawRow, COLUMN_ALIASES.companyId),
    originalAmount: amount,
    costCode: getCellString(rawRow, COLUMN_ALIASES.costCode) || null,
    accountingMethod: getCellString(rawRow, COLUMN_ALIASES.accountingMethod) || "amount",
    description: getCellString(rawRow, COLUMN_ALIASES.description) || null,
    retentionPercentage: getCellNumber(rawRow, COLUMN_ALIASES.retentionPercentage),
    startDate: parseDateCell(rawRow, COLUMN_ALIASES.startDate),
    estCompletionDate: parseDateCell(rawRow, COLUMN_ALIASES.estCompletionDate),
    contractDate: parseDateCell(rawRow, COLUMN_ALIASES.contractDate),
    signedDate: parseDateCell(rawRow, COLUMN_ALIASES.signedDate),
    actualCompletionDate: parseDateCell(rawRow, COLUMN_ALIASES.actualCompletionDate),
    issuedOnDate: parseDateCell(rawRow, COLUMN_ALIASES.issuedOnDate),
    inclusions: getCellString(rawRow, COLUMN_ALIASES.inclusions) || null,
    exclusions: getCellString(rawRow, COLUMN_ALIASES.exclusions) || null,
  };
}

export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/commitments/import#POST",
  async ({ request, params }) => {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/commitments/import#POST",
        message: "Authentication required.",
      });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });

    // Find the right sheet — prefer "Commitments", fall back to first sheet
    const sheetName =
      workbook.SheetNames.find((n) => n.toLowerCase().includes("commitment")) ??
      workbook.SheetNames[0];

    if (!sheetName) {
      return NextResponse.json({ error: "No sheet found in file." }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: true,
    });

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "Sheet has no data rows." }, { status: 400 });
    }

    // Normalize all header keys to lowercase
    const normalizedRows = rawRows.map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(row)) {
        normalized[normalizeHeader(key)] = val;
      }
      return normalized;
    });

    const supabase = await createClient();
    const results = { imported: 0, failed: 0, errors: [] as string[] };

    for (const rawRow of normalizedRows) {
      const row = parseRow(rawRow);
      if (!row) continue; // skip header rows / empty rows

      // Skip rows with placeholder company IDs
      if (row.companyId.includes("LOOKUP") || row.companyId.includes("NOT FOUND")) {
        results.failed++;
        results.errors.push(`${row.number}: missing company ID — skipped`);
        continue;
      }

      const type = row.type.toLowerCase().replace(/[^a-z_]/g, "");
      const isPO = type === "purchase_order" || type === "purchaseorder" || type === "po";

      const insertData = mapFormToInsert(
        {
          contractNumber: row.number,
          contractCompanyId: row.companyId || null,
          title: row.title,
          status: row.status,
          executed: normalizeSubcontractStatus(row.status) === "Approved",
          defaultRetainagePercent: row.retentionPercentage,
          description: row.description,
          inclusions: row.inclusions,
          exclusions: row.exclusions,
          contractDate: row.contractDate ?? undefined,
          startDate: row.startDate ?? undefined,
          estimatedCompletionDate: row.estCompletionDate ?? undefined,
          actualCompletionDate: row.actualCompletionDate ?? undefined,
          signedContractReceivedDate: row.signedDate ?? undefined,
          issuedOnDate: row.issuedOnDate ?? undefined,
        },
        projectIdNum,
        user.id,
      );

      const table = isPO ? "purchase_orders" : "subcontracts";
      const sovTable = isPO ? "purchase_order_sov_items" : "subcontract_sov_items";
      const sovFk = isPO ? "purchase_order_id" : "subcontract_id";

      const { data: created, error: insertError } = await supabase
        .from(table as "subcontracts")
        .insert(insertData)
        .select("id")
        .single();

      if (insertError || !created) {
        const msg = insertError?.message ?? "unknown error";
        logger.error({ msg: `[commitments/import] failed to insert ${row.number}`, error: msg });
        results.failed++;
        results.errors.push(`${row.number}: ${msg}`);
        continue;
      }

      // Create a single SOV item for the original amount
      if (row.originalAmount > 0) {
        const { error: sovError } = await supabase
          .from(sovTable as "subcontract_sov_items")
          .insert({
            [sovFk]: created.id,
            line_number: 1,
            description: row.description || row.title,
            amount: row.originalAmount,
            ...(row.costCode ? { budget_code: row.costCode } : {}),
          });

        if (sovError) {
          logger.error({ msg: `[commitments/import] SOV insert failed for ${row.number}`, error: sovError.message });
          // Non-fatal — commitment was created, just without SOV
        }
      }

      results.imported++;
    }

    logger.info({ msg: `[commitments/import] project ${projectId}: imported=${results.imported} failed=${results.failed}` });

    return NextResponse.json({
      success: results.imported > 0,
      imported: results.imported,
      failed: results.failed,
      errors: results.errors,
      message:
        results.failed > 0
          ? `Imported ${results.imported} commitments. ${results.failed} failed.`
          : `Successfully imported ${results.imported} commitments.`,
    });
  },
);
