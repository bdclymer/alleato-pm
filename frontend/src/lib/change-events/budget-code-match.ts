import { apiFetch } from "@/lib/api-client";
import type {
  BudgetCodeOption,
  CommitmentSovLineItem,
} from "@/components/domain/change-events/change-event-form/types";

/**
 * Single source of truth for matching a commitment's SOV budget code to a
 * project budget-code dropdown option, used by BOTH change-event line-item
 * editors:
 *   - ChangeEventForm (new/edit pages, via useChangeEventFormData)
 *   - ChangeEventLineItemsTable (change-event detail page inline editor)
 *
 * These two editors previously had divergent implementations: the form auto-
 * populated the budget code from the selected commitment, but the inline detail
 * editor populated only the vendor and silently left the budget code blank.
 * That drift is what this module exists to prevent — change matching here once.
 */

/** Strip dashes/dots/slashes so "233000" matches "23-3000", "23.3000", etc. */
export function normCode(value: string): string {
  return value.replace(/[-./]/g, "").toLowerCase();
}

export function findBudgetCode(
  code: string | null,
  budgetCodes: BudgetCodeOption[],
): BudgetCodeOption | undefined {
  if (!code) return undefined;
  const q = code.trim().toLowerCase();
  const qNorm = normCode(q);
  return (
    // 1. Exact match
    budgetCodes.find((b) => b.code === code) ||
    // 2. Case-insensitive exact match
    budgetCodes.find((b) => b.code.toLowerCase() === q) ||
    // 3. Normalized match — "233000" matches "23-3000"
    budgetCodes.find((b) => normCode(b.code) === qNorm) ||
    // 4. Description match
    budgetCodes.find((b) => b.description.toLowerCase() === q) ||
    // 5. Full label prefix match
    budgetCodes.find((b) => b.fullLabel.toLowerCase().startsWith(q))
  );
}

export interface BudgetCodeResolution {
  /** project_budget_codes.id of the matched dropdown option, if resolvable. */
  budgetCodeId?: string;
  /** Description to copy from the single SOV line, if there is exactly one. */
  description?: string;
  /** Why a budget code could NOT be resolved — for surfacing to the user. */
  reason?: "no_sov" | "multiple_codes" | "code_not_in_project";
}

/**
 * Resolve a budget code from a commitment's SOV line items.
 * Auto-fills only when every SOV line shares one budget code (unambiguous);
 * when they differ, the caller must let the user pick the specific SOV line.
 */
export function resolveBudgetCodeFromSov(
  items: CommitmentSovLineItem[],
  budgetCodes: BudgetCodeOption[],
): BudgetCodeResolution {
  if (items.length === 0) return { reason: "no_sov" };

  const firstCode = items[0].budget_code;
  const allSameCode =
    firstCode !== null && items.every((i) => i.budget_code === firstCode);

  if (!allSameCode) return { reason: "multiple_codes" };

  const resolution: BudgetCodeResolution = {};
  const match = findBudgetCode(firstCode, budgetCodes);
  if (match) {
    resolution.budgetCodeId = match.id;
  } else {
    resolution.reason = "code_not_in_project";
  }

  if (items.length === 1 && items[0].description) {
    resolution.description = items[0].description;
  }

  return resolution;
}

/** Strip the "po-"/"sub-" prefix the comboboxes use to namespace commitment ids. */
export function stripCommitmentPrefix(commitmentId: string): string {
  return commitmentId.replace(/^(po|sub)-/, "");
}

/**
 * Fetch a commitment's SOV line items, returning [] on any failure so callers
 * can cache the empty result and avoid refetching.
 */
export async function fetchCommitmentSovLineItems(
  projectId: number | string,
  commitmentId: string,
): Promise<CommitmentSovLineItem[]> {
  const rawId = stripCommitmentPrefix(commitmentId);
  try {
    const data = await apiFetch<{ data: CommitmentSovLineItem[] }>(
      `/api/projects/${projectId}/commitments/${rawId}/line-items`,
    );
    return data.data || [];
  } catch {
    return [];
  }
}
