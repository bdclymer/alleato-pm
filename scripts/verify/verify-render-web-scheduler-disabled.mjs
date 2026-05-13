#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const BLUEPRINTS = ["render.yaml", "backend/render.yaml"];
const RENDER_SERVICES_URL = "https://api.render.com/v1/services?limit=100";
const RENDER_SERVICE_URL = "https://api.render.com/v1/services";

const REQUIRED_WEB_FLAGS = new Map([
  ["DISABLE_SCHEDULER", "true"],
  ["GRAPH_SYNC_ENABLED", "false"],
  ["GRAPH_SYNC_OUTLOOK", "false"],
  ["GRAPH_SYNC_TEAMS", "false"],
  ["GRAPH_SYNC_TEAMS_DM", "false"],
  ["GRAPH_SYNC_ONEDRIVE", "false"],
  ["INTELLIGENCE_COMPILER_ENABLED", "false"],
  ["SOURCE_SYNC_HEALTH_RECOMPUTE_ENABLED", "false"],
  ["FIREFLIES_PIPELINE_BACKLOG_ENABLED", "false"],
  ["TASK_EXTRACTION_ENABLED", "false"],
]);

const REQUIRED_SUSPENDED_CRONS = new Set([
  "alleato-acumatica-financial-sync",
]);

const SAFE_RESTART_CRON_SCHEDULES = new Map([
  "alleato-executive-daily-brief-evening",
  "alleato-executive-daily-brief-morning",
  "alleato-graph-sync",
  "alleato-rag-health",
  "alleato-source-rag-health",
  "alleato-source-sync-health",
  "alleato-task-extraction",
  "alleato-teams-channel-sync",
  "alleato-teams-dm-sync",
].map((name) => [name, null]));

SAFE_RESTART_CRON_SCHEDULES.set("alleato-executive-daily-brief-evening", "30 22,23 * * 1-5");
SAFE_RESTART_CRON_SCHEDULES.set("alleato-executive-daily-brief-morning", "0 11,12 * * 1-5");
SAFE_RESTART_CRON_SCHEDULES.set("alleato-graph-sync", "20 */2 * * *");
SAFE_RESTART_CRON_SCHEDULES.set("alleato-rag-health", "15 12 * * *");
SAFE_RESTART_CRON_SCHEDULES.set("alleato-source-rag-health", "5 */4 * * *");
SAFE_RESTART_CRON_SCHEDULES.set("alleato-source-sync-health", "*/30 * * * *");
SAFE_RESTART_CRON_SCHEDULES.set("alleato-task-extraction", "0 7 * * *");
SAFE_RESTART_CRON_SCHEDULES.set("alleato-teams-channel-sync", "10 * * * *");
SAFE_RESTART_CRON_SCHEDULES.set("alleato-teams-dm-sync", "40 * * * *");

const DISABLED_CRON_SCHEDULE = "0 0 1 1 *";

function isStructurallyDisabledCron(service) {
  const schedule = service?.serviceDetails?.schedule || service?.schedule;
  const command = service?.serviceDetails?.envSpecificDetails?.dockerCommand || "";
  return schedule === DISABLED_CRON_SCHEDULE && command.includes("disabled while DB incident guard is active");
}

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

async function fetchRenderJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

async function fetchRenderJsonWithRetry(url, token, attempts = 3) {
  let lastError;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await fetchRenderJson(url, token);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (index + 1)));
    }
  }
  throw lastError;
}

async function verifyRenderCronSuspensions() {
  const token = process.env.RENDER_API_KEY;
  if (!token) {
    return;
  }

  let services;
  try {
    services = await fetchRenderJson(RENDER_SERVICES_URL, token);
  } catch (error) {
    failures.push(
      `Render API cron guard failed: ${error.message}`,
    );
  }

  if (services) {
    const idsByName = new Map();
    for (const item of services) {
      const service = item.service ?? item;
      if (
        service?.type === "cron_job" &&
        (REQUIRED_SUSPENDED_CRONS.has(service.name) || SAFE_RESTART_CRON_SCHEDULES.has(service.name))
      ) {
        idsByName.set(service.name, service.id);
      }
      if (
        service?.type === "cron_job" &&
        REQUIRED_SUSPENDED_CRONS.has(service.name) &&
        service.suspended !== "suspended" &&
        !isStructurallyDisabledCron(service)
      ) {
        console.warn(
          `Render cron ${service.name} list endpoint is stale or unsafe; direct service checks remain the source of truth`,
        );
      }
    }

    for (const name of REQUIRED_SUSPENDED_CRONS) {
      const id = idsByName.get(name);
      if (!id) {
        failures.push(`Render cron ${name} is missing from the Render service list`);
        continue;
      }
      let service;
      try {
        service = await fetchRenderJsonWithRetry(`${RENDER_SERVICE_URL}/${id}`, token);
      } catch (error) {
        failures.push(`Render cron ${name} direct check failed: ${error.message}`);
        continue;
      }
      if (service.suspended !== "suspended" && !isStructurallyDisabledCron(service)) {
        failures.push(
          `Render cron ${name} must stay suspended or structurally disabled while DB incident guard is active; found ${service.suspended || "<unknown>"}`,
        );
      }
    }

    for (const [name, expectedSchedule] of SAFE_RESTART_CRON_SCHEDULES.entries()) {
      const id = idsByName.get(name);
      if (!id) {
        failures.push(`Render cron ${name} is missing from the Render service list`);
        continue;
      }
      let service;
      try {
        service = await fetchRenderJsonWithRetry(`${RENDER_SERVICE_URL}/${id}`, token);
      } catch (error) {
        failures.push(`Render cron ${name} direct check failed: ${error.message}`);
        continue;
      }
      const schedule = service?.serviceDetails?.schedule || service?.schedule;
      if (service.suspended !== "suspended" && schedule !== expectedSchedule) {
        failures.push(
          `Render cron ${name} may only be resumed on schedule ${expectedSchedule}; found ${schedule || "<unknown>"}`,
        );
      }
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
