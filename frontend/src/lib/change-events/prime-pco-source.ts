export interface PrimePcoSourceChangeEvent {
  id: string;
  number: string | null;
  title: string;
  reason: string | null;
  prime_contract_id: string | null;
  prime_contract?: PrimePcoSourceContract | null;
  line_items?: PrimePcoSourceLineItem[];
}

export interface PrimePcoSourceContract {
  id: string;
  contract_number: string | null;
  title: string | null;
  status?: string | null;
  client?: { id: string; name: string } | null;
  vendor?: { id: string; name: string } | null;
}

export interface PrimePcoSourceLineItem {
  contract_id?: string | null;
  contract?: PrimePcoSourceContract | null;
  commitment?: {
    prime_contract_id?: string | null;
    primeContractId?: string | null;
  } | null;
}

export function parseChangeEventIdsParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function buildPrimePcoSourceTitle(
  events: PrimePcoSourceChangeEvent[],
): string {
  if (events.length === 0) {
    return "PCO for change event";
  }

  if (events.length === 1) {
    const event = events[0];
    const number = event.number?.trim();
    const label = number ? `CE ${number}` : "CE";
    return `PCO for ${label} - ${event.title}`.trim();
  }

  return `PCO for ${events.length} change events`;
}

export function resolveSourcePrimeContractId(
  events: PrimePcoSourceChangeEvent[],
  availableContractIds: Set<string>,
): string | null {
  for (const contractId of getSourcePrimeContractIds(events)) {
    if (availableContractIds.has(contractId)) {
      return contractId;
    }
  }

  return null;
}

export function getSourcePrimeContractIds(
  events: PrimePcoSourceChangeEvent[],
): string[] {
  const ids = new Set<string>();

  for (const event of events) {
    if (event.prime_contract_id) {
      ids.add(event.prime_contract_id);
    }

    for (const lineItem of event.line_items ?? []) {
      if (lineItem.contract_id) {
        ids.add(lineItem.contract_id);
      }
      if (lineItem.contract?.id) {
        ids.add(lineItem.contract.id);
      }
      const commitmentPrimeContractId =
        lineItem.commitment?.prime_contract_id ??
        lineItem.commitment?.primeContractId ??
        null;
      if (commitmentPrimeContractId) {
        ids.add(commitmentPrimeContractId);
      }
    }
  }

  return Array.from(ids);
}

export function getSourcePrimeContracts(
  events: PrimePcoSourceChangeEvent[],
): PrimePcoSourceContract[] {
  const contractsById = new Map<string, PrimePcoSourceContract>();

  for (const event of events) {
    if (event.prime_contract?.id) {
      contractsById.set(event.prime_contract.id, event.prime_contract);
    }

    for (const lineItem of event.line_items ?? []) {
      if (lineItem.contract?.id && !contractsById.has(lineItem.contract.id)) {
        contractsById.set(lineItem.contract.id, lineItem.contract);
      }
    }
  }

  return Array.from(contractsById.values());
}

export function resolveSourceChangeReason(
  events: PrimePcoSourceChangeEvent[],
  allowedReasons: readonly string[],
): string | null {
  const sourceWithReason = events.find((event) => event.reason);
  if (!sourceWithReason?.reason) return null;

  const matched = allowedReasons.find(
    (reason) => reason.toLowerCase() === sourceWithReason.reason!.toLowerCase(),
  );

  return matched ?? sourceWithReason.reason;
}
