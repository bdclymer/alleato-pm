/**
 * Regression test for: Estimated Completion not shown on subcontract detail.
 *
 * Root cause: normalizeCommitment in the commitment detail page was reading
 * `substantial_completion_date`, but the subcontracts view exposes the field
 * as `estimated_completion_date`. The date was saved correctly but never
 * surfaced to the UI.
 *
 * Fix: prefer `estimated_completion_date`; fall back to `substantial_completion_date`.
 *
 * This test mirrors the date-resolution logic from normalizeCommitment in
 * frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx.
 * The function is inside a "use client" Next.js page so it is tested via
 * extracted logic here rather than a direct import.
 */

/** Mirrors the date-resolution branch in normalizeCommitment */
function resolveCompletionDate(record: Record<string, unknown>): string | undefined {
  return typeof record.estimated_completion_date === "string"
    ? record.estimated_completion_date
    : typeof record.substantial_completion_date === "string"
      ? record.substantial_completion_date
      : undefined;
}

describe("normalizeCommitment — completion date resolution", () => {
  it("prefers estimated_completion_date over substantial_completion_date (regression: was reading wrong field)", () => {
    const result = resolveCompletionDate({
      estimated_completion_date: "2025-12-31",
      substantial_completion_date: "2025-06-30",
    });
    expect(result).toBe("2025-12-31");
  });

  it("falls back to substantial_completion_date when estimated is absent", () => {
    const result = resolveCompletionDate({
      substantial_completion_date: "2025-06-30",
    });
    expect(result).toBe("2025-06-30");
  });

  it("returns undefined when both fields are absent", () => {
    const result = resolveCompletionDate({});
    expect(result).toBeUndefined();
  });

  it("returns undefined when estimated_completion_date is not a string", () => {
    const result = resolveCompletionDate({
      estimated_completion_date: null,
      substantial_completion_date: null,
    });
    expect(result).toBeUndefined();
  });

  it("uses estimated_completion_date when substantial is absent (original failing case)", () => {
    // This is the case that was broken: the view only exposes estimated_completion_date
    // and substantial_completion_date is not present at all.
    const result = resolveCompletionDate({
      estimated_completion_date: "2026-03-15",
    });
    expect(result).toBe("2026-03-15");
  });
});
