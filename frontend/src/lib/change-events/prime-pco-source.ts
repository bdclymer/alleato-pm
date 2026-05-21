export interface PrimePcoSourceChangeEvent {
  id: string;
  number: string | null;
  title: string;
  reason: string | null;
  prime_contract_id: string | null;
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
  const sourceWithContract = events.find(
    (event) =>
      event.prime_contract_id &&
      availableContractIds.has(event.prime_contract_id),
  );

  return sourceWithContract?.prime_contract_id ?? null;
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
