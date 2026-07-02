import type { SupabaseClient } from "@supabase/supabase-js";
import { GuardrailError } from "@/lib/guardrails/errors";

import type { Database } from "@/types/database.types";

type RuntimeSupabaseClient = SupabaseClient<Database>;

type PrimeContractIdValue = string | null | undefined;
type ContractIdValue = string | number | null | undefined;

export interface PrimeContractChangeOrderParentContext {
  supabase: RuntimeSupabaseClient;
  projectId: number;
  primeContractId?: PrimeContractIdValue;
  contractId?: ContractIdValue;
  where: string;
}

export interface PrimeContractChangeOrderParentResolution {
  primeContractId: string | null;
  contractId: string | number | null;
}

function normalizePrimeContractId(value: PrimeContractIdValue): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeContractId(value: ContractIdValue): string | number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }
    return Math.trunc(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && Number.isInteger(numeric)) {
    return numeric;
  }

  return trimmed;
}

export async function resolvePrimeContractChangeOrderParent({
  supabase,
  projectId,
  primeContractId,
  contractId,
  where,
}: PrimeContractChangeOrderParentContext): Promise<PrimeContractChangeOrderParentResolution> {
  const normalizedPrimeContractId = normalizePrimeContractId(primeContractId);
  const normalizedContractId = normalizeContractId(contractId);

  if (normalizedPrimeContractId) {
    const { data: existingPrimeContract, error } = await supabase
      .from("prime_contracts")
      .select("id")
      .eq("id", normalizedPrimeContractId)
      .eq("project_id", projectId)
      .single();

    if (error || !existingPrimeContract) {
      throw new GuardrailError({
        code: "NOT_FOUND",
        where,
        message: `Prime contract '${normalizedPrimeContractId}' was not found for this project.`,
        status: 404,
      });
    }

    return {
      primeContractId: normalizedPrimeContractId,
      contractId: normalizedContractId,
    };
  }

  if (normalizedContractId !== null) {
    return {
      primeContractId: null,
      contractId: normalizedContractId,
    };
  }

  const { data: candidateContracts, error: candidateError } = await supabase
    .from("prime_contracts")
    .select("id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (candidateError) {
    throw new GuardrailError({
      code: "DB_ERROR",
      where,
      message: `Failed to resolve a prime contract for project ${projectId}.`,
      details: candidateError.message,
      cause: candidateError,
    });
  }

  if (!candidateContracts || candidateContracts.length === 0) {
    throw new GuardrailError({
      code: "NOT_FOUND",
      where,
      message: `No prime contracts found for project ${projectId}.`,
      status: 404,
    });
  }

  if (candidateContracts.length > 1) {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where,
      message: `Multiple prime contracts exist for project ${projectId}. Provide prime_contract_id explicitly.`,
      details: {
        candidate_count: candidateContracts.length,
      },
    });
  }

  return {
    primeContractId: candidateContracts[0].id,
    contractId: null,
  };
}
