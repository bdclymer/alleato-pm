import { NextResponse } from "next/server";
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
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { projectId?: number; contractId?: string; entities?: ExportEntity[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const projectId = body.projectId;
  const contractId = body.contractId;
  if (!projectId || typeof projectId !== "number") {
    return NextResponse.json(
      { error: "projectId (number) is required" },
      { status: 400 },
    );
  }

  const entities =
    body.entities && body.entities.length > 0
      ? body.entities.filter((entity): entity is ExportEntity =>
          ALL_ENTITIES.includes(entity),
        )
      : ALL_ENTITIES;

  try {
    const results: Partial<Record<ExportEntity, unknown>> = {};

    if (entities.includes("commitments")) {
      results.commitments = await exportCommitmentsToAcumatica(projectId);
    }
    if (entities.includes("primeContracts")) {
      results.primeContracts = await exportPrimeContractsToAcumatica(projectId);
    }
    if (entities.includes("changeOrders")) {
      results.changeOrders = await exportChangeOrdersToAcumatica(projectId);
    }
    if (entities.includes("invoices")) {
      results.invoices = await exportOwnerInvoicesToAcumatica(projectId);
    }
    if (entities.includes("paymentApplications")) {
      results.paymentApplications = await exportPaymentApplicationsToAcumatica(
        projectId,
        contractId,
      );
    }

    return NextResponse.json({
      success: true,
      projectId,
      contractId: contractId ?? null,
      entities,
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
