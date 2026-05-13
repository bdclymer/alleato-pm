#!/usr/bin/env node
import "dotenv/config";

import fs from "node:fs";
import yaml from "js-yaml";

const ACTIVE_BACKEND_HOST = "alleato-backend-rbnj.onrender.com";
const DEFAULT_BACKEND_URL = `https://${ACTIVE_BACKEND_HOST}`;
const backendUrl = (
  process.env.PYTHON_BACKEND_URL ||
  process.env.RENDER_BACKEND_URL ||
  process.env.BACKEND_URL ||
  DEFAULT_BACKEND_URL
).replace(/\/$/, "");

const expectEnabled = process.env.DEEP_AGENTS_EXPECT_ENABLED === "true";
const adminApiKey = process.env.ADMIN_API_KEY;
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function findBackendService(manifestPath) {
  const parsed = yaml.load(fs.readFileSync(manifestPath, "utf8"));
  const services = Array.isArray(parsed?.services) ? parsed.services : [];
  return services.find((service) => service?.type === "web" && service?.name === "alleato-backend");
}

function getEnvValue(service, key) {
  const envVars = Array.isArray(service?.envVars) ? service.envVars : [];
  const match = envVars.find((item) => item?.key === key);
  return match?.value;
}

function verifyManifest(manifestPath) {
  const service = findBackendService(manifestPath);
  if (!service) {
    fail(`${manifestPath}: missing web service named alleato-backend`);
    return;
  }

  const expected = {
    DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED: false,
    DEEP_AGENTS_PROJECT_INTELLIGENCE_RUNTIME: "contract_spike",
    DEEP_AGENTS_PROJECT_INTELLIGENCE_MODEL: "gpt-5.4-mini",
  };

  for (const [key, value] of Object.entries(expected)) {
    const actual = getEnvValue(service, key);
    if (actual !== value) {
      fail(`${manifestPath}: expected ${key}=${value}; found ${actual ?? "missing"}`);
    }
  }
}

async function verifyRenderApiServiceMapping() {
  const apiKey = process.env.RENDER_API_KEY;
  if (!apiKey) {
    warn("RENDER_API_KEY is not available; skipped Render service mapping check.");
    return;
  }

  const response = await fetch("https://api.render.com/v1/services?limit=100", {
    headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    warn(`Render service mapping check failed with HTTP ${response.status}.`);
    return;
  }

  const entries = Array.isArray(payload) ? payload : payload.services ?? [];
  const backendServices = entries
    .map((entry) => entry.service ?? entry)
    .filter((service) => service?.name === "alleato-backend");
  const activeService = backendServices.find((service) =>
    String(service?.serviceDetails?.url ?? "").includes(ACTIVE_BACKEND_HOST),
  );
  if (!activeService) {
    fail(
      `Render API key does not expose the active ${ACTIVE_BACKEND_HOST} service. Refusing to use any other Render backend service.`,
    );
  }
}

async function main() {
  verifyManifest("render.yaml");
  verifyManifest("backend/render.yaml");

  if (!backendUrl.includes(ACTIVE_BACKEND_HOST)) {
    fail(`Backend URL must point at ${ACTIVE_BACKEND_HOST}; found ${backendUrl}`);
  }

  const healthResponse = await fetch(`${backendUrl}/health`, {
    headers: { accept: "application/json" },
  });
  const health = await healthResponse.json().catch(() => ({}));
  if (!healthResponse.ok || health.status !== "healthy") {
    fail(`Active backend health failed: HTTP ${healthResponse.status}, status=${health.status ?? "missing"}`);
  }
  if (health.ai_gateway_configured !== true) {
    fail("Active backend health does not show AI Gateway configured.");
  }
  if (health.supabase_service_configured !== true) {
    fail("Active backend health does not show Supabase service configured.");
  }

  let endpointState = "not_checked";
  let endpointMode = null;
  if (!adminApiKey) {
    fail("ADMIN_API_KEY is required for the Deep Agents endpoint readiness probe.");
  } else {
    const response = await fetch(`${backendUrl}/api/intelligence/deep-agent/project-status`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-admin-api-key": adminApiKey,
      },
      body: JSON.stringify({
        userId: "deep-agents-nonprod-readiness",
        projectId: 43,
        sessionId: "deep-agents-nonprod-readiness",
        question: "What is the current risk/status on this project?",
        mode: "project_status_risk",
      }),
    });
    const payload = await response.json().catch(() => ({}));
    endpointMode = payload.mode ?? null;
    if (response.status === 503 && String(payload.detail ?? "").includes("Deep Agents project intelligence is disabled")) {
      endpointState = "disabled";
    } else if (response.ok && endpointMode === "deep_agents") {
      endpointState = "deep_agents";
    } else if (response.ok) {
      endpointState = endpointMode ?? "enabled_unknown_mode";
    } else {
      fail(`Deep Agents endpoint probe failed with HTTP ${response.status}.`);
    }
  }

  if (expectEnabled && endpointState !== "deep_agents") {
    fail(`DEEP_AGENTS_EXPECT_ENABLED=true requires endpoint mode deep_agents; found ${endpointState}.`);
  }

  await verifyRenderApiServiceMapping();

  const result = {
    backendUrl,
    health: {
      status: health.status ?? null,
      ai_gateway_configured: health.ai_gateway_configured === true,
      supabase_service_configured: health.supabase_service_configured === true,
    },
    endpointState,
    endpointMode,
    expectEnabled,
    warnings,
  };

  if (failures.length > 0) {
    console.error("Deep Agents non-production readiness check failed:");
    for (const item of failures) console.error(`- ${item}`);
    if (warnings.length > 0) {
      console.error("Warnings:");
      for (const item of warnings) console.error(`- ${item}`);
    }
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log("Deep Agents non-production readiness check passed");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
