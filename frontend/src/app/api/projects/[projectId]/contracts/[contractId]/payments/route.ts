import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/projects/[projectId]/contracts/[contractId]/payments
 * Returns all payments received for a prime contract
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/contracts/[contractId]/payments#GET",
  async ({ request, params }) => {
  
    const { projectId, contractId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("prime_contract_payments")
      .select(
        `
        *,
        payment_application:prime_contract_payment_applications(
          id,
          application_number,
          amount,
          status
        )
      `,
      )
      .eq("contract_id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .order("payment_date", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch payments", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(data ?? []);
    },
);

/**
 * POST /api/projects/[projectId]/contracts/[contractId]/payments
 * Prime contract payments are read-only Acumatica inbound records.
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/contracts/[contractId]/payments#POST",
  async () => {
    throw new GuardrailError({
      code: "READ_ONLY_RESOURCE",
      where: "projects/[projectId]/contracts/[contractId]/payments#POST",
      message:
        "Prime contract payments are synced from Acumatica and cannot be created in Alleato.",
      status: 405,
      severity: "low",
    });
  },
);
