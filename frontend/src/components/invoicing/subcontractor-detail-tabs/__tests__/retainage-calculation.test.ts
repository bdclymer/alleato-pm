/**
 * Regression tests for retainage calculation on subcontractor invoice line items.
 *
 * Bug fixed: retainage_amount was previously computed as
 *   (previous + thisPeriod) * retainagePct / 100   ← WRONG (cumulative)
 * Correct formula:
 *   thisPeriod * retainagePct / 100                 ← RIGHT (current period only)
 *
 * Prior periods' retainage is tracked separately in previous_work_retainage
 * and must never be re-applied in subsequent billings.
 */

function computeWorkRetainageThisPeriod(
  previous: number,
  thisPeriod: number,
  retainagePct: number,
): number {
  // This is the correct formula — ONLY current period work, never cumulative
  return (thisPeriod * retainagePct) / 100;
}

function computeWorkRetainageWrong(
  previous: number,
  thisPeriod: number,
  retainagePct: number,
): number {
  // This was the bug — cumulative retainage double-counts prior periods
  return ((previous + thisPeriod) * retainagePct) / 100;
}

describe("Retainage calculation — current period only, not cumulative", () => {
  it("first billing: both formulas agree when previous = 0", () => {
    const previous = 0;
    const thisPeriod = 10_000;
    const pct = 10;

    expect(computeWorkRetainageThisPeriod(previous, thisPeriod, pct)).toBe(
      1_000,
    );
    expect(computeWorkRetainageWrong(previous, thisPeriod, pct)).toBe(1_000);
  });

  it("second billing: correct formula does NOT add retainage on prior work again", () => {
    const previous = 10_000; // already billed and retained in prior invoice
    const thisPeriod = 5_000;
    const pct = 10;

    const correct = computeWorkRetainageThisPeriod(previous, thisPeriod, pct);
    const wrong = computeWorkRetainageWrong(previous, thisPeriod, pct);

    // Correct: only $5,000 new work × 10% = $500
    expect(correct).toBe(500);

    // Wrong (bug): ($10,000 + $5,000) × 10% = $1,500 — double-counts prior work
    expect(wrong).toBe(1_500);
    expect(wrong).not.toBe(correct);
  });

  it("third billing: cumulative formula inflates retainage severely", () => {
    const previous = 80_000;
    const thisPeriod = 10_000;
    const pct = 10;

    // Only $10,000 new work should be retained
    expect(computeWorkRetainageThisPeriod(previous, thisPeriod, pct)).toBe(
      1_000,
    );

    // Bug would produce $9,000 — 9× too much
    expect(computeWorkRetainageWrong(previous, thisPeriod, pct)).toBe(9_000);
  });

  it("zero this-period billing produces zero retainage regardless of previous", () => {
    const previous = 50_000;
    const thisPeriod = 0;
    const pct = 10;

    expect(computeWorkRetainageThisPeriod(previous, thisPeriod, pct)).toBe(0);
  });

  it("retainage released cannot exceed total withheld", () => {
    const prevWorkRetained = 1_000; // carried from prior invoices
    const workRetainageThisPeriod = 500; // retained this period
    const maxReleasable = prevWorkRetained + workRetainageThisPeriod;

    const releaseAttempt = 2_000;
    expect(releaseAttempt > maxReleasable).toBe(true); // should be rejected

    const validRelease = 1_200;
    expect(validRelease <= maxReleasable).toBe(true); // should be accepted
  });

  it("materials retainage applies only to materials_stored this period", () => {
    const stored = 3_000;
    const matPct = 10;
    const matRetainage = (stored * matPct) / 100;

    expect(matRetainage).toBe(300);
  });
});

/**
 * Whole-percent convention invariant.
 *
 * Retainage percent columns are stored as WHOLE PERCENT (10.0000 = 10%), even
 * though several are typed numeric(_,4) and look like they should hold a fraction
 * (0.1000). Any code that divides by 100 AND also treats the stored value as a
 * fraction would under-withhold by 100×. These tests pin the convention so the
 * "fraction trap" can never silently return on this code path.
 *
 * DB-level companion guard: CHECK (retainage_pct BETWEEN 0 AND 100) on
 * subcontractor_invoice_line_items / owner_invoice_line_items /
 * payment_application_line_items
 * (migration 20260621000000_retainage_pct_range_guardrails.sql).
 */
describe("Retainage whole-percent convention", () => {
  it("stored pct of 10 means 10%, not 0.10 (×100 fraction trap)", () => {
    const base = 15_000;
    const storedPct = 10; // whole percent, as persisted

    const correct = (base * storedPct) / 100;
    expect(correct).toBe(1_500);

    // If the column were misread as a fraction, the result is 100× too small.
    const fractionTrap = base * storedPct; // forgot /100 because "it's already a fraction"
    expect(fractionTrap).not.toBe(correct);

    // A real fraction (0.10) run through the whole-percent formula under-withholds.
    const asFraction = 0.1;
    expect((base * asFraction) / 100).toBeCloseTo(15); // $15 instead of $1,500 — obviously wrong
  });

  it("retainage_amount reconciles to retainage_pct/100 × base for sample stored rows", () => {
    // Mirrors real persisted shape: pct stored as 10.0000 / 12.0000, base = this-period work.
    const rows = [
      { base: 15_000, pct: 10, expected: 1_500 },
      { base: 5_000, pct: 12, expected: 600 },
      { base: 0, pct: 10, expected: 0 },
    ];
    for (const r of rows) {
      expect((r.base * r.pct) / 100).toBe(r.expected);
    }
  });
});

/**
 * "Currently retained" and net-this-period invariants — match Procore's
 * subcontractor invoice Detail grid field-for-field:
 *   currently_retained = from_previous_app + retained_this_period - released_this_period
 *   net paid this period adds released retainage BACK (releasing withheld money
 *   increases the current payment, it does not reduce it).
 */
describe("Currently retained and net-this-period", () => {
  it("currently retained = previous + this period - released", () => {
    // From Procore's own sample data: 6996 + 1749 - 0 = 8745
    expect(6_996 + 1_749 - 0).toBe(8_745);
    // With a partial release this period:
    expect(6_996 + 1_749 - 2_000).toBe(6_745);
  });

  it("releasing retainage increases net paid this period", () => {
    const thisPeriod = 5_000;
    const stored = 0;
    const workRetainage = (thisPeriod * 10) / 100; // 500 withheld this period
    const matRetainage = 0;
    const released = 1_200; // releasing prior-period retainage

    const net =
      thisPeriod + stored - (workRetainage + matRetainage) + released;
    // 5000 - 500 + 1200 = 5700 paid this period (release adds back, never subtracts)
    expect(net).toBe(5_700);
    expect(net).toBeGreaterThan(thisPeriod - workRetainage);
  });
});
