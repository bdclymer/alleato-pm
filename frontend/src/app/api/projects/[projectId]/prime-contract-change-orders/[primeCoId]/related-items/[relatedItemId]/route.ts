import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{
    projectId: string;
    primeCoId: string;
    relatedItemId: string;
  }>;
}

export const DELETE = withApiGuardrails(
  "projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items/[relatedItemId]#DELETE",
  async ({ params }: RouteParams) => {
    const { projectId, primeCoId, relatedItemId } = await params;
    const parsedProjectId = Number.parseInt(projectId, 10);
    const parsedPrimeCoId = Number.parseInt(primeCoId, 10);

    if (Number.isNaN(parsedProjectId) || Number.isNaN(parsedPrimeCoId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const guard = await requirePermission(parsedProjectId, "change_orders", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items/[relatedItemId]#DELETE",
        message: "Authentication required.",
      });
    }

    const { error } = await supabase
      .from("prime_contract_change_order_related_items")
      .delete()
      .eq("id", relatedItemId)
      .eq("project_id", parsedProjectId)
      .eq("prime_co_id", parsedPrimeCoId);

    if (error) {
      if (
        error.code === "42P01" ||
        error.message?.includes("Could not find") ||
        error.message?.includes("schema cache")
      ) {
        return NextResponse.json(
          { error: "Related items are unavailable until migrations are applied" },
          { status: 503 },
        );
      }

      return apiErrorResponse(error);
    }

    return new NextResponse(null, { status: 204 });
  },
);
