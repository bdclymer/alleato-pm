import test from "node:test";
import assert from "node:assert/strict";

import {
  findSilentCatchBlocks,
  findSyntheticDataFallbacks,
} from "../check-no-new-unsafe-patterns.mjs";

test("silent catch detector flags empty catch blocks", () => {
  const violations = findSilentCatchBlocks(`
    try {
      risky();
    } catch {
    }
  `);

  assert.equal(violations.length, 1);
});

test("silent catch detector flags comment-only catch blocks", () => {
  const violations = findSilentCatchBlocks(`
    try {
      risky();
    } catch (error) {
      // Non-critical
    }
  `);

  assert.equal(violations.length, 1);
});

test("silent catch detector allows structured reporting", () => {
  const violations = findSilentCatchBlocks(`
    try {
      risky();
    } catch (error) {
      reportNonCriticalFailure({
        area: "test",
        operation: "risky",
        error,
        userVisibleFallback: "The optional panel is unavailable.",
      });
    }
  `);

  assert.equal(violations.length, 0);
});

test("synthetic data fallback detector flags useFallback options", () => {
  const violations = findSyntheticDataFallbacks(`
    export function useCostCodes({ useFallback = true } = {}) {
      return [];
    }
  `);

  assert.equal(violations.length, 1);
});

test("synthetic data fallback detector flags mock data wording", () => {
  const violations = findSyntheticDataFallbacks(`
    // For now, return mock data until the endpoint exists.
    const rows = [];
  `);

  assert.equal(violations.length, 1);
});

test("synthetic data fallback detector allows normal fallback UI props", () => {
  const violations = findSyntheticDataFallbacks(`
    <Suspense fallback={null}>
      <RealDataTable />
    </Suspense>
  `);

  assert.equal(violations.length, 0);
});
