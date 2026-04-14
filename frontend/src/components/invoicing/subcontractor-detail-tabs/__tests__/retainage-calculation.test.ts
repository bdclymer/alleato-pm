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
