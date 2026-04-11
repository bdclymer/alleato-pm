#!/usr/bin/env node

/**
 * Contract-aware API smoke suite.
 *
 * Verifies:
 * - critical endpoint status codes
 * - standardized error envelope (or legacy fallback) on failures
 * - unauthorized behavior on protected endpoints
 */

const BASE_URL = process.env.API_SMOKE_BASE_URL || "http://localhost:3000";

const checks = [
  { name: "Health", method: "GET", path: "/api/health", expected: [200] },
  { name: "Projects unauthorized", method: "GET", path: "/api/projects", expected: [401] },
  { name: "Cron unauthorized", method: "POST", path: "/api/cron/daily-flags", expected: [401] },
  { name: "Monitoring notify unauthorized", method: "GET", path: "/api/monitoring/notify", expected: [401] },
];

function hasStandardErrorEnvelope(body) {
  return (
    body &&
    typeof body === "object" &&
    body.success === false &&
    typeof body.error_code === "string" &&
    typeof body.error_message === "string" &&
    typeof body.where_it_failed === "string" &&
    typeof body.request_id === "string" &&
    typeof body.timestamp === "string"
  );
}

function hasLegacyErrorEnvelope(body) {
  return body && typeof body === "object" && typeof body.error === "string";
}

async function run() {
  const failures = [];
  let pass = 0;

  for (const check of checks) {
    const url = `${BASE_URL}${check.path}`;
    const res = await fetch(url, { method: check.method });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    const statusOk = check.expected.includes(res.status);
    if (!statusOk) {
      failures.push(
        `${check.name}: expected [${check.expected.join(", ")}], got ${res.status} (${check.path})`,
      );
      continue;
    }

    if (res.status >= 400) {
      const hasStandard = hasStandardErrorEnvelope(body);
      const hasLegacy = hasLegacyErrorEnvelope(body);
      if (!hasStandard && !hasLegacy) {
        failures.push(
          `${check.name}: error response missing required envelope fields (${check.path})`,
        );
        continue;
      }
    } else if (!body || typeof body !== "object") {
      failures.push(`${check.name}: success response should be a JSON object (${check.path})`);
      continue;
    }

    pass += 1;
    console.log(`PASS ${check.name} [${res.status}]`);
  }

  console.log(`\nSmoke contracts summary: ${pass}/${checks.length} passed`);
  if (failures.length > 0) {
    console.error("\nFailures:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

run().catch((error) => {
  console.error("Smoke contract suite failed to run:", error);
  process.exit(1);
});

