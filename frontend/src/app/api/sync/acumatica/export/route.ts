import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import {
  exportChangeOrdersToAcumatica,
  exportCommitmentsToAcumatica,
  exportOwnerInvoicesToAcumatica,
  exportPaymentApplicationsToAcumatica,
  exportPrimeContractsToAcumatica,
} from "@/lib/acumatica/sync";

type ExportEntity =
  | "commitments"
  | "primeContracts"
  | "changeOrders"
  | "invoices"
  | "paymentApplications";

const ALL_ENTITIES: ExportEntity[] = [
  "commitments",
  "primeContracts",
  "changeOrders",
  "invoices",
  "paymentApplications",
];

const ExportEntitySchema = z.enum([
  "commitments",
  "primeContracts",
  "changeOrders",
  "invoices",
  "paymentApplications",
]);

const ExportRequestSchema = z.object({
  projectId: z.number().int().positive(),
  contractId: z.string().optional(),
  entities: z.array(ExportEntitySchema).optional(),
});

/**
 * POST /api/sync/acumatica/export
 *
 * Pushes app records to Acumatica (write sync).
 *
 * Body:
 * {
 *   projectId: number,
 *   contractId?: string,
 *   entities?: Array<"commitments" | "primeContracts" | "changeOrders" | "invoices" | "paymentApplications">
 * }
 */
export const POST = withApiGuardrails("/api/sync/acumatica/export#POST", async ({ request }) => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/sync/acumatica/export#POST",
      message: "Unauthorized Acumatica export sync request.",
      status: 401,
      severity: "medium",
      details: authError ? { reason: authError.message } : undefined,
      cause: authError ?? undefined,
    });
  }

  const body = await parseJsonBody(
    request,
    ExportRequestSchema,
    "/api/sync/acumatica/export#POST",
  );
  const { projectId, contractId } = body;

  const entities =
    body.entities && body.entities.length > 0
      ? body.entities.filter((entity): entity is ExportEntity =>
          ALL_ENTITIES.includes(entity),
        )
      : ALL_ENTITIES;

  try {
    const runId = crypto.randomUUID();
    const auditContext = { runId, userId: user.id };
    const results: Partial<Record<ExportEntity, unknown>> = {};

    if (entities.includes("commitments")) {
      results.commitments = await exportCommitmentsToAcumatica(
        projectId,
        auditContext,
      );
    }
    if (entities.includes("primeContracts")) {
      results.primeContracts = await exportPrimeContractsToAcumatica(
        projectId,
        auditContext,
      );
    }
    if (entities.includes("changeOrders")) {
      results.changeOrders = await exportChangeOrdersToAcumatica(
        projectId,
        auditContext,
      );
    }
    if (entities.includes("invoices")) {
      results.invoices = await exportOwnerInvoicesToAcumatica(
        projectId,
        auditContext,
      );
    }
    if (entities.includes("paymentApplications")) {
      results.paymentApplications = await exportPaymentApplicationsToAcumatica(
        projectId,
        contractId,
        auditContext,
      );
    }

    return NextResponse.json({
      success: true,
      runId,
      projectId,
      contractId: contractId ?? null,
      entities,
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: "/api/sync/acumatica/export#POST",
      message: "Acumatica export sync failed.",
      details: { reason: err instanceof Error ? err.message : "Unknown error" },
      cause: err instanceof Error ? err : undefined,
    });
  }
});
