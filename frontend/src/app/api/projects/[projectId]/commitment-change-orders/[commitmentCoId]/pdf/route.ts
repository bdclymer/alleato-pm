import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { getScopedCommitmentChangeOrder } from "@/lib/change-orders/commitment-change-orders";
import { buildCommitmentCoPdfHtml } from "@/lib/commitment-co-pdf";
import { renderPdfFromHtml } from "@/lib/documents/pdf";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiGuardrails<{ projectId: string; commitmentCoId: string }>(
  "projects/[projectId]/commitment-change-orders/[commitmentCoId]/pdf#GET",
  async ({ params }) => {
    const supabase = await createClient();
    const { projectId, commitmentCoId } = params;
    const projectIdNum = Number(projectId);

    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/commitment-change-orders/[commitmentCoId]/pdf#GET",
        message: "Authentication required.",
      });
    }

    const scoped = await getScopedCommitmentChangeOrder(
      supabase,
      projectIdNum,
      commitmentCoId,
    );

    if (!scoped) {
      throw new GuardrailError({
        code: "ROUTE_BINDING_MISSING",
        where: "projects/[projectId]/commitment-change-orders/[commitmentCoId]/pdf#GET",
        message: "Commitment change order not found.",
        status: 404,
        severity: "low",
        details: { projectId: projectIdNum, commitmentCoId },
      });
    }

    const { data: lineItems, error: lineItemsError } = await supabase
      .from("commitment_change_order_lines")
      .select("id, description, amount, cost_code_id, cost_type_id, budget_line_id, created_at")
      .eq("commitment_change_order_id", commitmentCoId)
      .order("created_at", { ascending: true });

    if (lineItemsError) {
      return apiErrorResponse(lineItemsError);
    }

    const costTypeIds = [
      ...new Set(
        (lineItems ?? [])
          .map((item) => item.cost_type_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const costTypeLabelById = new Map<string, string>();
    if (costTypeIds.length > 0) {
      const { data: costTypes, error: costTypesError } = await supabase
        .from("cost_code_types")
        .select("id, code, description")
        .in("id", costTypeIds);

      if (costTypesError) {
        return apiErrorResponse(costTypesError);
      }

      for (const costType of costTypes ?? []) {
        costTypeLabelById.set(
          costType.id,
          `${costType.code} - ${costType.description}`,
        );
      }
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name, project_number, address, state")
      .eq("id", projectIdNum)
      .single();

    if (projectError) {
      return apiErrorResponse(projectError);
    }

    const html = buildCommitmentCoPdfHtml({
      changeOrderNumber: scoped.change_order_number,
      title: scoped.title,
      description: scoped.description,
      status: scoped.status,
      amount: scoped.amount,
      requestedDate: scoped.requested_date,
      approvedDate: scoped.approved_date,
      createdAt: scoped.created_at,
      commitmentNumber: scoped.commitment_number,
      projectName: project?.name ?? null,
      projectNumber: project?.project_number ?? null,
      projectAddress: [project?.address, project?.state]
        .filter(Boolean)
        .join(", "),
      lineItems: (lineItems ?? []).map((item) => ({
        description: item.description,
        amount: item.amount,
        costCodeLabel: item.cost_code_id || "Unmapped",
        costTypeLabel: item.cost_type_id
          ? costTypeLabelById.get(item.cost_type_id) ?? item.cost_type_id
          : "—",
      })),
    });

    const pdfBuffer = await renderPdfFromHtml(html, {});
    const safeNumber = scoped.change_order_number || "CCO";
    const safeTitle = (scoped.title || scoped.description || "commitment-change-order")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeNumber}-${safeTitle || "commitment-change-order"}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  },
);
