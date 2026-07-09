/**
 * Tests for the payment-application (AIA G702/G703) money module.
 *
 * These exercise the REAL shipping functions (not re-implemented copies). Two guardrails:
 *
 *  1. Parity — `computeLineFinancials` must equal the Postgres GENERATED column
 *     expressions on `subcontractor_invoice_line_items`. The SQL expressions are
 *     replicated here as an independent oracle; if the module drifts from the DB, the
 *     parity test fails. This is the guardrail for the class of bug where four copies of
 *     the math silently diverge.
 *
 *  2. Behavior lock — `computeSubcontractorRollup` is pinned to known G702 fixtures so the
 *     behavior-preserving extraction can be proven (old numbers == new numbers), and the
 *     retainage-release special case is covered.
 */
import {
  computeLineFinancials,
  computeSubcontractorRollup,
  materialsCurrentlyRetained,
  workCurrentlyRetained,
  type PaymentApplicationLineInput,
} from "../payment-application";

// ── DB generated-column oracle ──────────────────────────────────────────────
// Mirrors supabase/migrations/*_create_subcontractor_invoices.sql and
// *_subcontractor_invoice_retainage_release_net.sql. Do NOT import the module here —
// this is the independent source of truth the module is checked against.
function dbGeneratedColumns(row: {
  work_completed_previous: number;
  work_completed_period: number;
  materials_stored: number;
  retainage_amount: number;
  materials_retainage_amount: number;
  work_retainage_released: number;
  materials_retainage_released: number;
  scheduled_value: number;
}) {
  const total_completed_stored =
    row.work_completed_previous + row.work_completed_period + row.materials_stored;
  return {
    total_completed_stored,
    balance_to_finish: row.scheduled_value - total_completed_stored,
    net_amount_this_period:
      row.work_completed_period +
      row.materials_stored -
      (row.retainage_amount + row.materials_retainage_amount) +
      (row.work_retainage_released + row.materials_retainage_released),
  };
}

describe("computeLineFinancials — parity with Postgres GENERATED columns", () => {
  const cases: Array<{ name: string; input: PaymentApplicationLineInput }> = [
    {
      name: "typical progress billing",
      input: {
        scheduled_value: 100_000,
        work_completed_previous: 20_000,
        work_completed_period: 30_000,
        materials_stored: 5_000,
        retainage_pct: 10,
        materials_retainage_pct: 10,
        work_retainage_released: 0,
        materials_retainage_released: 0,
        previous_work_retainage: 2_000,
        previous_materials_retainage: 0,
      },
    },
    {
      name: "with a retainage release this period",
      input: {
        scheduled_value: 80_000,
        work_completed_previous: 80_000,
        work_completed_period: 0,
        materials_stored: 0,
        retainage_pct: 5,
        materials_retainage_pct: 5,
        work_retainage_released: 4_000,
        materials_retainage_released: 500,
        previous_work_retainage: 4_000,
        previous_materials_retainage: 500,
      },
    },
    {
      name: "zero scheduled value (no divide-by-zero)",
      input: {
        scheduled_value: 0,
        work_completed_previous: 0,
        work_completed_period: 0,
        materials_stored: 0,
        retainage_pct: 10,
        materials_retainage_pct: 10,
      },
    },
  ];

  test.each(cases)("$name matches the DB expressions", ({ input }) => {
    const fin = computeLineFinancials(input);
    const oracle = dbGeneratedColumns({
      work_completed_previous: input.work_completed_previous ?? 0,
      work_completed_period: input.work_completed_period ?? 0,
      materials_stored: input.materials_stored ?? 0,
      retainage_amount: fin.retainage_amount,
      materials_retainage_amount: fin.materials_retainage_amount,
      work_retainage_released: input.work_retainage_released ?? 0,
      materials_retainage_released: input.materials_retainage_released ?? 0,
      scheduled_value: input.scheduled_value ?? 0,
    });
    expect(fin.total_completed_stored).toBeCloseTo(oracle.total_completed_stored, 6);
    expect(fin.balance_to_finish).toBeCloseTo(oracle.balance_to_finish, 6);
    expect(fin.net_amount_this_period).toBeCloseTo(oracle.net_amount_this_period, 6);
  });

  test("retainage applies to THIS period only, never cumulative", () => {
    // The regression the old test guarded, now on the real module: previous work must
    // not be re-retained. 30k this period at 10% = 3,000 — not (20k+30k)*10% = 5,000.
    const fin = computeLineFinancials({
      work_completed_previous: 20_000,
      work_completed_period: 30_000,
      retainage_pct: 10,
    });
    expect(fin.retainage_amount).toBe(3_000);
  });

  test("release caps = previous retainage + this-period retainage", () => {
    const fin = computeLineFinancials({
      work_completed_period: 10_000,
      retainage_pct: 10, // → 1,000 this period
      previous_work_retainage: 2_500,
      materials_stored: 4_000,
      materials_retainage_pct: 5, // → 200 this period
      previous_materials_retainage: 800,
    });
    expect(fin.max_work_releasable).toBe(3_500);
    expect(fin.max_materials_releasable).toBe(1_000);
  });
});

describe("currentlyRetained helpers — cumulative held per line", () => {
  test("work: previous + this-period − released", () => {
    expect(
      workCurrentlyRetained({
        previous_work_retainage: 4_000,
        retainage_amount: 1_000,
        work_retainage_released: 1_500,
      }),
    ).toBe(3_500);
  });
  test("materials: previous + this-period − released", () => {
    expect(
      materialsCurrentlyRetained({
        previous_materials_retainage: 800,
        materials_retainage_amount: 200,
        materials_retainage_released: 300,
      }),
    ).toBe(700);
  });
});

describe("computeSubcontractorRollup — G702 nine-line certificate", () => {
  test("progress billing rollup", () => {
    const rollup = computeSubcontractorRollup({
      lineItems: [
        {
          total_completed_stored: 50_000,
          retainage_amount: 3_000,
          materials_retainage_amount: 500,
          net_amount_this_period: 31_500,
        },
        {
          total_completed_stored: 20_000,
          retainage_amount: 2_000,
          materials_retainage_amount: 0,
          net_amount_this_period: 18_000,
        },
      ],
      original_contract_sum: 100_000,
      net_change_by_change_orders: 10_000,
      less_previous_certificates: 20_000,
      is_retainage_release: false,
    });

    expect(rollup.contract_sum_to_date).toBe(110_000); // Line 3 = 1 + 2
    expect(rollup.total_completed_and_stored).toBe(70_000); // Line 4
    expect(rollup.total_retainage).toBe(5_500); // Line 5
    expect(rollup.total_earned_less_retainage).toBe(64_500); // Line 6 = 4 − 5
    expect(rollup.current_payment_due).toBe(44_500); // Line 8 = 6 − 7
    // Line 9 = Contract Sum to Date − Total Earned Less Retainage (true AIA definition)
    expect(rollup.balance_to_finish_including_retainage).toBe(45_500);
  });

  test("retainage release: payment due equals the released amount", () => {
    const rollup = computeSubcontractorRollup({
      lineItems: [
        {
          total_completed_stored: 80_000,
          retainage_amount: 0,
          materials_retainage_amount: 0,
          net_amount_this_period: 4_000, // only the released retainage
        },
      ],
      original_contract_sum: 80_000,
      net_change_by_change_orders: 0,
      less_previous_certificates: 0, // ignored on a release
      is_retainage_release: true,
    });

    expect(rollup.current_payment_due).toBe(4_000);
    // less_previous_certificates is derived so 6 − 7 reconciles to the release.
    expect(rollup.less_previous_certificates).toBe(76_000);
  });

  test("empty line items produce a zeroed but consistent rollup", () => {
    const rollup = computeSubcontractorRollup({
      lineItems: [],
      original_contract_sum: 50_000,
      net_change_by_change_orders: 0,
      less_previous_certificates: 0,
      is_retainage_release: false,
    });
    expect(rollup.total_completed_and_stored).toBe(0);
    expect(rollup.current_payment_due).toBe(0);
    expect(rollup.balance_to_finish_including_retainage).toBe(50_000);
  });
});
