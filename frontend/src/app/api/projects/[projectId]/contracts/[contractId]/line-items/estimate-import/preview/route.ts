import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { isAuthError, verifyProjectAccess } from "@/lib/supabase/auth-guard";
import { requirePermission } from "@/lib/permissions-guard";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import {
  isAlleatoEstimateWorkbook,
  parseAlleatoEstimateWorkbook,
} from "@/lib/prime-contracts/estimate-workbook-sov";

const WHERE =
  "projects/[projectId]/contracts/[contractId]/line-items/estimate-import/preview#POST";

export const POST = withApiGuardrails<{
  projectId: string;
  contractId: string;
}>(WHERE, async ({ request, params }) => {
  const numericProjectId = Number.parseInt(params.projectId, 10);

  if (Number.isNaN(numericProjectId)) {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where: WHERE,
      message: "Invalid project ID.",
    });
  }

  const guard = await requirePermission(numericProjectId, "contracts", "read");
  if (guard.denied) return guard.response;

  const authResult = await verifyProjectAccess(numericProjectId);
  if (isAuthError(authResult)) return authResult;
  const supabase = authResult.serviceClient;

  const { data: contract, error: contractError } = await supabase
    .from("prime_contracts")
    .select("id")
    .eq("id", params.contractId)
    .eq("project_id", numericProjectId)
    .maybeSingle();

  if (contractError) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: WHERE,
      message: "Failed to verify prime contract.",
      details: contractError.message,
    });
  }

  if (!contract) {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where: WHERE,
      message: "Prime contract not found for this project.",
    });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where: WHERE,
      message: "No estimate workbook provided.",
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

  const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), {
    type: "buffer",
  });

  if (!isAlleatoEstimateWorkbook(workbook)) {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where: WHERE,
      message: "This workbook is not an Alleato estimate template.",
      details: "Expected sheets named General Conditions and Details.",
    });
  }

  const preview = parseAlleatoEstimateWorkbook(workbook);
  const { data: existingLineItems, error: existingLineItemsError } = await supabase
    .from("contract_line_items")
    .select("cost_code_id")
    .eq("contract_id", params.contractId);

  if (existingLineItemsError) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: WHERE,
      message: "Failed to check existing schedule of values lines.",
      details: existingLineItemsError.message,
    });
  }

  const existingCostCodeIds = new Set(
    (existingLineItems ?? [])
      .map((item) => item.cost_code_id)
      .filter((id): id is string => Boolean(id)),
  );

  const rows = preview.rows.map((row) => ({
    ...row,
    alreadyInSov: existingCostCodeIds.has(row.costCode),
    selectedByDefault:
      row.includeInOwnerSov &&
      !existingCostCodeIds.has(row.costCode) &&
      row.warnings.length === 0,
  }));

  return NextResponse.json({
    ...preview,
    rows,
    importableCount: rows.filter((row) => row.includeInPrimeContract).length,
    ownerSovCount: rows.filter((row) => row.includeInOwnerSov).length,
    selectedByDefaultCount: rows.filter((row) => row.selectedByDefault).length,
    existingSovMatchCount: rows.filter((row) => row.alreadyInSov).length,
    totalRows: rows.length,
  });
});
