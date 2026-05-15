import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { isAuthError, verifyProjectAccess } from "@/lib/supabase/auth-guard";
import { requirePermission } from "@/lib/permissions-guard";
import { NextResponse } from "next/server";

const WHERE = "projects/[projectId]/budget-codes/activate#POST";

interface ActivateBudgetCodeRow {
  costCode: string;
  costTypeCode: string;
  description: string;
}

interface CostCodeDivision {
  id: string;
  code: string;
}

function normalizeRows(input: unknown): ActivateBudgetCodeRow[] {
  if (!input || typeof input !== "object" || !("rows" in input)) return [];
  const rows = (input as { rows: unknown }).rows;
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row): ActivateBudgetCodeRow | null => {
      if (!row || typeof row !== "object") return null;
      const candidate = row as Partial<Record<keyof ActivateBudgetCodeRow, unknown>>;
      const costCode = typeof candidate.costCode === "string" ? candidate.costCode.trim() : "";
      const costTypeCode =
        typeof candidate.costTypeCode === "string" ? candidate.costTypeCode.trim().toUpperCase() : "";
      const description =
        typeof candidate.description === "string" && candidate.description.trim()
          ? candidate.description.trim()
          : costCode;

      if (!costCode || !costTypeCode) return null;
      return { costCode, costTypeCode, description };
    })
    .filter((row): row is ActivateBudgetCodeRow => Boolean(row));
}

function resolveDivisionId(costCodeId: string, divisions: CostCodeDivision[]): string | null {
  const [prefix] = costCodeId.split("-");
  const cleanedPrefix = prefix?.trim() || "";
  const normalizedPrefix = cleanedPrefix.replace(/^0+(\d)/, "$1");

  const byCode = divisions.find((division) => {
    const divisionCode = division.code.trim();
    const normalizedDivisionCode = divisionCode.replace(/^0+(\d)/, "$1");
    return divisionCode === cleanedPrefix || normalizedDivisionCode === normalizedPrefix;
  });

  if (byCode) return byCode.id;

  const generalDivision = divisions.find(
    (d) => d.id.toLowerCase() === "general" || d.code.toLowerCase() === "general",
  );
  if (generalDivision) return generalDivision.id;

  return divisions[0]?.id ?? null;
}

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

    const guard = await requirePermission(numericProjectId, "contracts", "write");
    if (guard.denied) return guard.response;

    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) return authResult;
    const supabase = authResult.serviceClient;

    const rows = normalizeRows(await request.json());
    if (rows.length === 0) {
      return NextResponse.json({ success: true, createdCostCodes: 0, addedProjectBudgetCodes: 0, reactivatedProjectBudgetCodes: 0 });
    }

    if (rows.length > 500) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: WHERE,
        message: "Maximum 500 rows can be activated at once.",
      });
    }

    const uniqueRows = Array.from(
      new Map(rows.map((row) => [`${row.costCode}|${row.costTypeCode}`, row])).values(),
    );

    const { data: costTypes, error: costTypesError } = await supabase
      .from("cost_code_types")
      .select("id, code")
      .in("code", [...new Set(uniqueRows.map((row) => row.costTypeCode))]);

    if (costTypesError) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: WHERE,
        message: "Failed to resolve cost types.",
        details: costTypesError.message,
      });
    }

    const costTypeIdByCode = new Map((costTypes ?? []).map((row) => [row.code, row.id]));
    const missingCostTypes = uniqueRows
      .map((row) => row.costTypeCode)
      .filter((code) => !costTypeIdByCode.has(code));

    if (missingCostTypes.length > 0) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: WHERE,
        message: `Unknown cost type${missingCostTypes.length === 1 ? "" : "s"}: ${[...new Set(missingCostTypes)].join(", ")}.`,
      });
    }

    const costCodeIds = [...new Set(uniqueRows.map((row) => row.costCode))];
    const { data: existingCostCodes, error: existingCostCodesError } = await supabase
      .from("cost_codes")
      .select("id")
      .in("id", costCodeIds);

    if (existingCostCodesError) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: WHERE,
        message: "Failed to check existing cost codes.",
        details: existingCostCodesError.message,
      });
    }

    const existingCostCodeIds = new Set((existingCostCodes ?? []).map((row) => row.id));
    const missingCostCodeRows = uniqueRows.filter((row) => !existingCostCodeIds.has(row.costCode));

    if (missingCostCodeRows.length > 0) {
      const { data: divisionsData, error: divisionsError } = await supabase
        .from("cost_code_divisions")
        .select("id, code")
        .eq("is_active", true)
        .order("code", { ascending: true });

      if (divisionsError) {
        throw new GuardrailError({
          code: "UPSTREAM_FAILURE",
          where: WHERE,
          message: "Failed to resolve cost-code divisions.",
          details: divisionsError.message,
        });
      }

      const divisions: CostCodeDivision[] = divisionsData ?? [];
      const costCodesToInsert = missingCostCodeRows.map((row) => {
        const divisionId = resolveDivisionId(row.costCode, divisions);
        if (!divisionId) {
          throw new GuardrailError({
            code: "INVALID_PAYLOAD",
            where: WHERE,
            message: `Could not determine division for cost code "${row.costCode}".`,
          });
        }
        return { id: row.costCode, title: row.description, division_id: divisionId, status: "active" };
      });

      const { error: createCostCodesError } = await supabase
        .from("cost_codes")
        .upsert(costCodesToInsert, { onConflict: "id" });

      if (createCostCodesError) {
        throw new GuardrailError({
          code: "UPSTREAM_FAILURE",
          where: WHERE,
          message: "Failed to create missing cost codes.",
          details: createCostCodesError.message,
        });
      }
    }

    const { data: existingProjectBudgetCodes, error: existingProjectBudgetCodesError } =
      await supabase
        .from("project_budget_codes")
        .select("id, cost_code_id, cost_type_id, is_active")
        .eq("project_id", numericProjectId)
        .in("cost_code_id", costCodeIds);

    if (existingProjectBudgetCodesError) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: WHERE,
        message: "Failed to check existing project budget codes.",
        details: existingProjectBudgetCodesError.message,
      });
    }

    const existingByKey = new Map(
      (existingProjectBudgetCodes ?? []).map((row) => [`${row.cost_code_id}|${row.cost_type_id}`, row]),
    );

    const toInsert = uniqueRows
      .filter((row) => {
        const costTypeId = costTypeIdByCode.get(row.costTypeCode);
        return !existingByKey.has(`${row.costCode}|${costTypeId}`);
      })
      .map((row) => ({
        project_id: numericProjectId,
        cost_code_id: row.costCode,
        cost_type_id: costTypeIdByCode.get(row.costTypeCode)!,
        description: row.description,
        is_active: true,
      }));

    const toActivate = (existingProjectBudgetCodes ?? [])
      .filter((row) => {
        const matchesImport = uniqueRows.some((candidate) => {
          const costTypeId = costTypeIdByCode.get(candidate.costTypeCode);
          return candidate.costCode === row.cost_code_id && costTypeId === row.cost_type_id;
        });
        return matchesImport && !row.is_active;
      })
      .map((row) => row.id);

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from("project_budget_codes").insert(toInsert);
      if (insertError) {
        throw new GuardrailError({
          code: "UPSTREAM_FAILURE",
          where: WHERE,
          message: "Failed to activate project budget codes.",
          details: insertError.message,
        });
      }
    }

    if (toActivate.length > 0) {
      const { error: reactivateError } = await supabase
        .from("project_budget_codes")
        .update({ is_active: true })
        .in("id", toActivate);

      if (reactivateError) {
        throw new GuardrailError({
          code: "UPSTREAM_FAILURE",
          where: WHERE,
          message: "Failed to reactivate project budget codes.",
          details: reactivateError.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      createdCostCodes: missingCostCodeRows.length,
      addedProjectBudgetCodes: toInsert.length,
      reactivatedProjectBudgetCodes: toActivate.length,
    });
  },
);
