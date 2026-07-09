/**
 * Payment application (AIA G702/G703) financials — the single owner of invoice money math.
 *
 * This module is the deep seam for the schedule-of-values (SOV) calculation shared by
 * subcontractor invoices (the API route, the SOV editor tabs, the PDF) and — as a
 * fast-follow — owner/prime payment applications. Before it existed the math was forked
 * across four call sites that disagreed on AIA Lines 8 and 9. See `CONTEXT.md` →
 * "Invoicing / payment applications" for the domain terms.
 *
 * The nine G702 certificate lines:
 *   1 Original Contract Sum
 *   2 Net Change by Change Orders
 *   3 Contract Sum to Date            (1 ± 2)
 *   4 Total Completed & Stored to Date
 *   5 Retainage                        (5a work + 5b materials)
 *   6 Total Earned Less Retainage      (4 − 5)
 *   7 Less Previous Certificates for Payment
 *   8 Current Payment Due              (6 − 7; on a retainage release, the released amount)
 *   9 Balance to Finish, Incl. Retainage (3 − 6)
 *
 * ── Behavior-preserving extraction (Slice 1) ────────────────────────────────────────
 * `computeSubcontractorRollup` reproduces the previous inline rollup EXACTLY (numbers
 * unchanged). Two correctness discrepancies were found while unifying and are tracked as
 * SEPARATE, independently-verified fixes — deliberately NOT changed here, because altering
 * them changes live payment-due amounts:
 *   (A) Line 5 sums THIS-period retainage (`retainage_amount`) rather than cumulative
 *       retainage held (`previous + this − released`). "Currently retained" is tracked
 *       cumulatively elsewhere. See `getWorkCurrentlyRetained` semantics.
 *   (B) The prime-side calc's Line 9 uses `scheduledValue − completedAndStored`, which is
 *       non-AIA. Line 9 must be `contractSumToDate − totalEarnedLessRetainage` (as the
 *       subcontractor path already does).
 * See docs/ops/handoffs for the correctness-fix follow-up.
 */

/** Per-line inputs the SOV editor and server write path operate on. */
export interface PaymentApplicationLineInput {
  scheduled_value?: number | null;
  work_completed_previous?: number | null;
  work_completed_period?: number | null;
  materials_stored?: number | null;
  retainage_pct?: number | null;
  materials_retainage_pct?: number | null;
  work_retainage_released?: number | null;
  materials_retainage_released?: number | null;
  previous_work_retainage?: number | null;
  previous_materials_retainage?: number | null;
}

/** Per-line derived figures. Mirrors the Postgres GENERATED columns + editor preview. */
export interface PaymentApplicationLineFinancials {
  /** = work_completed_previous + work_completed_period + materials_stored (DB generated). */
  total_completed_stored: number;
  /** = total_completed_stored / scheduled_value * 100 (0 when scheduled is 0). */
  work_completed_pct: number;
  /** = scheduled_value − total_completed_stored (DB generated). */
  balance_to_finish: number;
  /** = work_completed_period * retainage_pct / 100 (this-period work retainage). */
  retainage_amount: number;
  /** = materials_stored * materials_retainage_pct / 100 (this-period materials retainage). */
  materials_retainage_amount: number;
  /**
   * = (work_completed_period + materials_stored)
   *   − (retainage_amount + materials_retainage_amount)
   *   + (work_retainage_released + materials_retainage_released)   (DB generated).
   */
  net_amount_this_period: number;
  /** Cumulative work retainage held: previous + this − released. */
  work_currently_retained: number;
  /** Cumulative materials retainage held: previous + this − released. */
  materials_currently_retained: number;
  /** Max releasable this period: previous_work_retainage + retainage_amount. */
  max_work_releasable: number;
  /** Max releasable this period: previous_materials_retainage + materials_retainage_amount. */
  max_materials_releasable: number;
}

/** The 9-line G702 rollup (snake_case to match the API/hook/tab contract). */
export interface PaymentApplicationRollup {
  original_contract_sum: number;
  net_change_by_change_orders: number;
  contract_sum_to_date: number;
  total_completed_and_stored: number;
  total_work_retainage: number;
  total_materials_retainage: number;
  total_retainage: number;
  total_earned_less_retainage: number;
  less_previous_certificates: number;
  current_payment_due: number;
  balance_to_finish_including_retainage: number;
}

const num = (value: number | null | undefined): number => Number(value) || 0;

/**
 * Derive per-line figures from raw inputs. Retainage amounts are recomputed from their
 * percentages (this-period only), matching the SOV editor preview and the server write
 * path. `total_completed_stored`, `balance_to_finish`, and `net_amount_this_period` are
 * pinned by test to the Postgres GENERATED column expressions.
 */
export function computeLineFinancials(
  input: PaymentApplicationLineInput,
): PaymentApplicationLineFinancials {
  const scheduled = num(input.scheduled_value);
  const previous = num(input.work_completed_previous);
  const thisPeriod = num(input.work_completed_period);
  const stored = num(input.materials_stored);
  const workPct = num(input.retainage_pct);
  const matPct = num(input.materials_retainage_pct);
  const workReleased = num(input.work_retainage_released);
  const matReleased = num(input.materials_retainage_released);
  const prevWorkRet = num(input.previous_work_retainage);
  const prevMatRet = num(input.previous_materials_retainage);

  const total_completed_stored = previous + thisPeriod + stored;
  // Retainage applies to THIS period's billing, not cumulative.
  const retainage_amount = (thisPeriod * workPct) / 100;
  const materials_retainage_amount = (stored * matPct) / 100;

  return {
    total_completed_stored,
    work_completed_pct:
      scheduled > 0 ? (total_completed_stored / scheduled) * 100 : 0,
    balance_to_finish: scheduled - total_completed_stored,
    retainage_amount,
    materials_retainage_amount,
    net_amount_this_period:
      thisPeriod +
      stored -
      (retainage_amount + materials_retainage_amount) +
      workReleased +
      matReleased,
    work_currently_retained: prevWorkRet + retainage_amount - workReleased,
    materials_currently_retained:
      prevMatRet + materials_retainage_amount - matReleased,
    max_work_releasable: prevWorkRet + retainage_amount,
    max_materials_releasable: prevMatRet + materials_retainage_amount,
  };
}

/** A persisted line's cumulative work retainage held: previous + this-period − released. */
export function workCurrentlyRetained(line: {
  previous_work_retainage?: number | null;
  retainage_amount?: number | null;
  work_retainage_released?: number | null;
}): number {
  return (
    num(line.previous_work_retainage) +
    num(line.retainage_amount) -
    num(line.work_retainage_released)
  );
}

/** A persisted line's cumulative materials retainage held: previous + this-period − released. */
export function materialsCurrentlyRetained(line: {
  previous_materials_retainage?: number | null;
  materials_retainage_amount?: number | null;
  materials_retainage_released?: number | null;
}): number {
  return (
    num(line.previous_materials_retainage) +
    num(line.materials_retainage_amount) -
    num(line.materials_retainage_released)
  );
}

/** Persisted per-line figures the rollup sums. Read from the DB (generated columns). */
export interface PaymentApplicationRollupLine {
  total_completed_stored?: number | null;
  retainage_amount?: number | null;
  materials_retainage_amount?: number | null;
  net_amount_this_period?: number | null;
}

/**
 * Compute the 9-line subcontractor rollup. BEHAVIOR-PRESERVING: reproduces the previous
 * inline implementation exactly (including discrepancies A and B noted above). The caller
 * supplies `original_contract_sum`, `net_change_by_change_orders`, and the pre-computed
 * `less_previous_certificates` (sum of prior approved invoices' net amounts).
 */
export function computeSubcontractorRollup(params: {
  lineItems: PaymentApplicationRollupLine[];
  original_contract_sum: number;
  net_change_by_change_orders: number;
  less_previous_certificates: number;
  is_retainage_release: boolean;
}): PaymentApplicationRollup {
  const {
    lineItems,
    original_contract_sum,
    net_change_by_change_orders,
    is_retainage_release,
  } = params;

  const total_completed_and_stored = lineItems.reduce(
    (sum, li) => sum + num(li.total_completed_stored),
    0,
  );
  const total_work_retainage = lineItems.reduce(
    (sum, li) => sum + num(li.retainage_amount),
    0,
  );
  const total_materials_retainage = lineItems.reduce(
    (sum, li) => sum + num(li.materials_retainage_amount),
    0,
  );
  const invoice_net_amount = lineItems.reduce(
    (sum, li) => sum + num(li.net_amount_this_period),
    0,
  );

  const total_retainage = total_work_retainage + total_materials_retainage;
  const total_earned_less_retainage =
    total_completed_and_stored - total_retainage;
  const contract_sum_to_date =
    original_contract_sum + net_change_by_change_orders;

  // On a retainage release, previous certificates are derived so that current payment due
  // equals only the released amount.
  const less_previous_certificates = is_retainage_release
    ? Math.max(total_earned_less_retainage - invoice_net_amount, 0)
    : params.less_previous_certificates;

  const current_payment_due = is_retainage_release
    ? invoice_net_amount
    : total_earned_less_retainage - less_previous_certificates;

  const balance_to_finish_including_retainage =
    contract_sum_to_date - total_earned_less_retainage;

  return {
    original_contract_sum,
    net_change_by_change_orders,
    contract_sum_to_date,
    total_completed_and_stored,
    total_work_retainage,
    total_materials_retainage,
    total_retainage,
    total_earned_less_retainage,
    less_previous_certificates,
    current_payment_due,
    balance_to_finish_including_retainage,
  };
}
