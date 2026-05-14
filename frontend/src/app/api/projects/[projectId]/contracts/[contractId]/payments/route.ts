import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function getContractMatchTokens(contractNumber: string | null, acumaticaProjectId: string | null): string[] {
  const tokens = new Set<string>();
  if (contractNumber) {
    tokens.add(contractNumber.toLowerCase());
    tokens.add(contractNumber.replace(/^PC-/i, "").toLowerCase());
  }
  if (acumaticaProjectId) tokens.add(acumaticaProjectId.toLowerCase());
  return Array.from(tokens).filter((token) => token.length >= 4);
}

function isLikelyContractPayment(
  payment: {
    acumatica_ref_nbr: string | null;
    acumatica_doc_type: string | null;
    notes: string | null;
    reference_number: string | null;
    payment_number: string | null;
    payment_application_id: string | null;
  },
  matchTokens: string[],
): boolean {
  if (!payment.acumatica_ref_nbr) return true;
  if (payment.payment_application_id) return true;
  if (payment.acumatica_doc_type?.toLowerCase().includes("credit memo")) return false;
  if (matchTokens.length === 0) return true;

  const haystack = [
    payment.notes,
    payment.reference_number,
    payment.payment_number,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return matchTokens.some((token) => haystack.includes(token));
}

/**
 * GET /api/projects/[projectId]/contracts/[contractId]/payments
 * Returns all payments received for a prime contract
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/contracts/[contractId]/payments#GET",
  async ({ request, params }) => {
  
    const { projectId, contractId } = await params;
    const supabase = await createClient();
    const projectIdNum = parseInt(projectId, 10);

    const { data: contract, error: contractError } = await supabase
      .from("prime_contracts")
      .select("contract_number")
      .eq("id", contractId)
      .eq("project_id", projectIdNum)
      .single();

    if (contractError) {
      return NextResponse.json(
        { error: "Failed to verify contract before fetching payments", details: contractError.message },
        { status: 400 },
      );
    }

    const { data: projectRow } = await supabase
      .from("projects")
      .select("acumatica_project_id")
      .eq("id", projectIdNum)
      .maybeSingle();

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
      .eq("project_id", projectIdNum)
      .order("payment_date", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch payments", details: error.message },
        { status: 400 },
      );
    }

    const matchTokens = getContractMatchTokens(
      contract.contract_number,
      projectRow?.acumatica_project_id ?? null,
    );
    const filteredPayments = (data ?? []).filter((payment) =>
      isLikelyContractPayment(payment, matchTokens),
    );

    return NextResponse.json(filteredPayments);
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
