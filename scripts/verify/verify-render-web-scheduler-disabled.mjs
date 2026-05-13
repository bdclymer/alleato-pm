#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const BLUEPRINTS = ["render.yaml", "backend/render.yaml"];
const RENDER_SERVICES_URL = "https://api.render.com/v1/services?limit=100";

const REQUIRED_WEB_FLAGS = new Map([
  ["DISABLE_SCHEDULER", "true"],
  ["GRAPH_SYNC_ENABLED", "false"],
  ["INTELLIGENCE_COMPILER_ENABLED", "false"],
  ["SOURCE_SYNC_HEALTH_RECOMPUTE_ENABLED", "false"],
  ["FIREFLIES_PIPELINE_BACKLOG_ENABLED", "false"],
  ["TASK_EXTRACTION_ENABLED", "false"],
]);

const REQUIRED_SUSPENDED_CRONS = new Set([
  "alleato-executive-daily-brief-evening",
  "alleato-executive-daily-brief-morning",
  "alleato-graph-sync",
  "alleato-rag-health",
  "alleato-source-rag-health",
  "alleato-source-sync-health",
  "alleato-task-extraction",
  "alleato-teams-channel-sync",
  "alleato-teams-dm-sync",
]);

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function envMap(service) {
  return new Map(
    (service.envVars ?? [])
      .filter((entry) => entry && typeof entry.key === "string")
      .map((entry) => [entry.key, normalizeValue(entry.value)]),
  );
}

const failures = [];

for (const blueprintPath of BLUEPRINTS) {
  const absolutePath = path.resolve(blueprintPath);
  const parsed = yaml.load(fs.readFileSync(absolutePath, "utf8"));
  const services = Array.isArray(parsed?.services) ? parsed.services : [];
  const backend = services.find(
    (service) => service?.type === "web" && service?.name === "alleato-backend",
  );

  if (!backend) {
    failures.push(`${blueprintPath}: missing web service named alleato-backend`);
    continue;
  }

  const env = envMap(backend);
  for (const [key, expected] of REQUIRED_WEB_FLAGS.entries()) {
    const actual = env.get(key);
    if (actual !== expected) {
      failures.push(
        `${blueprintPath}: alleato-backend must set ${key}=${expected}; found ${actual || "<missing>"}`,
      );
    }
  }
}

async function verifyRenderCronSuspensions() {
  const token = process.env.RENDER_API_KEY;
  if (!token) {
    return;
  }

  const response = await fetch(RENDER_SERVICES_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    failures.push(
      `Render API cron guard failed: ${response.status} ${response.statusText}`,
    );
    return;
  }

  const services = await response.json();
  for (const item of services) {
    const service = item.service ?? item;
    if (
      service?.type === "cron_job" &&
      REQUIRED_SUSPENDED_CRONS.has(service.name) &&
      service.suspended !== "suspended"
    ) {
      failures.push(
        `Render cron ${service.name} must stay suspended while AI/RAG ingestion is paused; found ${service.suspended || "<unknown>"}`,
      );
    }
  }
}

await verifyRenderCronSuspensions();

if (failures.length > 0) {
  console.error("Render web scheduler guardrail failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Render web scheduler guardrail passed.");
