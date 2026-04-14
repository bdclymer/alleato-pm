import test from "node:test";
import assert from "node:assert/strict";

import { resolveRawErrorEnforcement } from "../check-changed-route-guardrails.mjs";

test("changed-route guardrails enforce raw-error debt by default", () => {
  assert.equal(
    resolveRawErrorEnforcement({
      guardrailScope: "changed",
      envValue: undefined,
    }),
    true,
  );
});

test("full-route debt scans remain non-blocking for raw-error debt by default", () => {
  assert.equal(
    resolveRawErrorEnforcement({
      guardrailScope: "all",
      envValue: undefined,
    }),
    false,
  );
});

test("explicit environment override still wins", () => {
  assert.equal(
    resolveRawErrorEnforcement({
      guardrailScope: "all",
      envValue: "true",
    }),
    true,
  );
  assert.equal(
    resolveRawErrorEnforcement({
      guardrailScope: "changed",
      envValue: "false",
    }),
    false,
  );
});
