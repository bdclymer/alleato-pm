import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: {
    projectId: string;
    primeCoId: string;
    relatedItemId: string;
  };
}

export const DELETE = withApiGuardrails(
  "projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items/[relatedItemId]#DELETE",
  async ({ params }: RouteParams) => {
    const { projectId, primeCoId } = params;
    const parsedProjectId = Number.parseInt(projectId, 10);
    const parsedPrimeCoId = Number.parseInt(primeCoId, 10);

    if (Number.isNaN(parsedProjectId) || Number.isNaN(parsedPrimeCoId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const guard = await requirePermission(parsedProjectId, "change_orders", "write");
    if (guard.denied) return guard.response;

    throw new GuardrailError({
      code: "SCHEMA_MISMATCH",
      where: "projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items/[relatedItemId]#DELETE",
      message:
        "Cannot delete related items because prime_contract_change_order_related_items is not present in the live Supabase schema.",
    });
  },
);
