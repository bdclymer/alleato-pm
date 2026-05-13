import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { isAuthError, verifyProjectAccess } from "@/lib/supabase/auth-guard";
import { requirePermission } from "@/lib/permissions-guard";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import {
  isAlleatoEstimateWorkbook,
  parseAlleatoEstimateWorkbook,
} from "@/lib/budget/estimate-workbook-import";

const WHERE = "projects/[projectId]/budget/estimate-import/preview#POST";

export const POST = withApiGuardrails<{ projectId: string }>(
  WHERE,
  async ({ request, params }) => {
    const numericProjectId = Number.parseInt(params.projectId, 10);

    if (Number.isNaN(numericProjectId)) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: WHERE,
        message: "Invalid project ID.",
      });
    }

    const guard = await requirePermission(numericProjectId, "budget", "read");
    if (guard.denied) return guard.response;

    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) return authResult;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: WHERE,
        message: "No file provided.",
      });
    }

    const isExcel =
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xlsm") ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel";

    if (!isExcel) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: WHERE,
        message: "Upload an Alleato estimate workbook as .xlsx or .xlsm.",
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    if (!isAlleatoEstimateWorkbook(workbook)) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: WHERE,
        message: "This workbook is not an Alleato estimate template.",
        details: "Expected sheets named General Conditions and Details.",
      });
    }

    const preview = parseAlleatoEstimateWorkbook(workbook);
    const importableRows = preview.rows.filter((row) => row.includeInBudget);
    const ownerSovRows = preview.rows.filter((row) => row.includeInOwnerSov);

    return NextResponse.json({
      ...preview,
      importableCount: importableRows.length,
      ownerSovCount: ownerSovRows.length,
      skippedRows: preview.skippedRows,
      totalRows: preview.rows.length,
    });
  },
);
