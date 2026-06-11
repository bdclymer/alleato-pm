import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WHERE = "projects/[projectId]/budget-codes/acumatica#GET";

export interface AcumaticaBudgetCodeOption {
  value: string;
  label: string;
  code: string;
  description: string;
}

/**
 * GET /api/projects/[projectId]/budget-codes/acumatica
 *
 * Returns the cost codes used in a project's Acumatica budget so commitment
 * Schedule-of-Values lines can resolve their free-text `budget_code` to a
 * readable "code - description" label.
 *
 * These CSI-style codes (e.g. "024113" → "Selective Site Demolition") come from
 * the Acumatica import and do NOT exist in the internal `cost_codes` /
 * `project_budget_codes` chart of accounts that the sibling route serves.
 * `acumatica_project_budgets` is RLS-restricted to the service role, so this
 * read goes through a service client and only exposes the code + its
 * description — never the financial amounts on that table.
 */
export const GET = withApiGuardrails<{ projectId: string }>(
  WHERE,
  async ({ params }) => {
    const { projectId } = await params;
    const projectIdNum = Number.parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      throw new GuardrailError({
        code: "INVALID_INPUT",
        where: WHERE,
        message: "Invalid project ID",
      });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("acumatica_project_budgets")
      .select("cost_code, description")
      .eq("project_id", projectIdNum)
      .not("cost_code", "is", null);

    if (error) {
      throw new GuardrailError({
        code: "DB_ERROR",
        where: WHERE,
        message: `Failed to load Acumatica budget codes: ${error.message}`,
      });
    }

    // Collapse to one option per code, choosing the most frequently used
    // description (a single code can map to multiple descriptions across rows).
    const byCode = new Map<string, Map<string, number>>();
    for (const row of data ?? []) {
      const code = (row.cost_code ?? "").trim();
      if (!code) continue;
      const description = (row.description ?? "").trim();
      const counts = byCode.get(code) ?? new Map<string, number>();
      counts.set(description, (counts.get(description) ?? 0) + 1);
      byCode.set(code, counts);
    }

    const options: AcumaticaBudgetCodeOption[] = Array.from(byCode.entries())
      .map(([code, counts]) => {
        let bestDescription = "";
        let bestCount = -1;
        for (const [description, count] of counts) {
          if (description && count > bestCount) {
            bestDescription = description;
            bestCount = count;
          }
        }
        return {
          value: code,
          label: bestDescription ? `${code} - ${bestDescription}` : code,
          code,
          description: bestDescription,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({ budgetCodes: options });
  },
);
