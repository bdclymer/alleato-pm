#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import pg from "pg";

const RENDER_SERVICES_URL = "https://api.render.com/v1/services?limit=100";
const RENDER_SERVICE_URL = "https://api.render.com/v1/services";
const SERVICE_NAME = "alleato-acumatica-financial-sync";
const EXPECTED_SCHEDULE = process.env.ACUMATICA_SYNC_EXPECTED_SCHEDULE || "0 0,12 * * *";
// The production cadence is twice daily. Allow one hour of scheduler/provider
// jitter before treating the latest successful entity sync as stale.
const MAX_STALE_MINUTES = Number(process.env.ACUMATICA_SYNC_MAX_STALE_MINUTES || "780");
const REQUIRED_SUCCESS_ENTITIES = [
  "projects",
  "vendors",
  "change_orders",
  "change_orders_projection",
  "subcontracts",
  "purchase_orders",
  "ap_bills",
  "commitments_projection",
  "ar_invoices",
  "ar_payments",
  "ap_checks",
  "project_budgets",
];

function loadDotEnv() {
  if (!fs.existsSync(".env")) return;
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function requireEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var ${key}`);
  return value;
}

async function fetchRenderJson(url, token, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${url} failed: ${response.status} ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function getRenderCron(token) {
  const rows = await fetchRenderJson(RENDER_SERVICES_URL, token);
  const service = rows.map((row) => row.service ?? row).find((row) => row.name === SERVICE_NAME);
  if (!service?.id) {
    throw new Error(`Render cron ${SERVICE_NAME} was not found`);
  }
  return fetchRenderJson(`${RENDER_SERVICE_URL}/${service.id}`, token);
}

async function getRenderEnv(token, serviceId) {
  const rows = await fetchRenderJson(`${RENDER_SERVICE_URL}/${serviceId}/env-vars?limit=100`, token);
  return new Map(
    rows.map((row) => {
      const envVar = row.envVar ?? row;
      return [envVar.key, String(envVar.value ?? "").trim()];
    }),
  );
}

async function querySyncState(databaseUrl) {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  const client = new pg.Client({
    connectionString: url.toString(),
    connectionTimeoutMillis: 5000,
    application_name: "alleato-acumatica-sync-health-verifier",
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const state = await client.query(
      `
      select entity_name, status, last_success_at, last_started_at, updated_at, last_error
      from public.acumatica_sync_state
      where entity_name = any($1::text[])
      order by entity_name
      `,
      [REQUIRED_SUCCESS_ENTITIES],
    );
    const latestRun = await client.query(
      `
      select entity_name, status, started_at, finished_at, fetched, upserted, projected, error_message
      from public.acumatica_sync_runs
      order by started_at desc
      limit 1
      `,
    );
    return { state: state.rows, latestRun: latestRun.rows[0] || null };
  } finally {
    await client.end();
  }
}

function minutesSince(value) {
  if (!value) return null;
  return Math.floor((Date.now() - new Date(value).getTime()) / 60000);
}

loadDotEnv();

const failures = [];
const renderToken = requireEnv("RENDER_API_KEY");
const databaseUrl = requireEnv("DATABASE_URL");

const service = await getRenderCron(renderToken);
const schedule = service.serviceDetails?.schedule || service.schedule;
const command = service.serviceDetails?.envSpecificDetails?.dockerCommand || "";
const env = await getRenderEnv(renderToken, service.id);

if (service.suspended !== "not_suspended") {
  failures.push(`Render cron is ${service.suspended || "unknown"}`);
}
if (schedule !== EXPECTED_SCHEDULE) {
  failures.push(`Render cron schedule is ${schedule || "<missing>"}; expected ${EXPECTED_SCHEDULE}`);
}
if (!command.includes("run_acumatica_financial_sync.py")) {
  failures.push("Render cron command does not use scripts/run_acumatica_financial_sync.py");
}
if (env.get("APP_DB_PRESSURE_GUARD_REQUIRED")?.toLowerCase() !== "true") {
  failures.push("Render cron is missing APP_DB_PRESSURE_GUARD_REQUIRED=true");
}
if (!env.has("DATABASE_URL")) {
  failures.push("Render cron is missing DATABASE_URL for DB pressure guard");
}

const { state, latestRun } = await querySyncState(databaseUrl);
const stateByEntity = new Map(state.map((row) => [row.entity_name, row]));

for (const entity of REQUIRED_SUCCESS_ENTITIES) {
  const row = stateByEntity.get(entity);
  if (!row) {
    failures.push(`${entity} has no acumatica_sync_state row`);
    continue;
  }
  if (row.status !== "success") {
    failures.push(`${entity} status=${row.status}: ${String(row.last_error || "").slice(0, 160)}`);
  }
  const staleMinutes = minutesSince(row.last_success_at);
  if (staleMinutes === null || staleMinutes > MAX_STALE_MINUTES) {
    failures.push(`${entity} last_success_at is stale (${staleMinutes ?? "missing"}m)`);
  }
}

if (!latestRun) {
  failures.push("acumatica_sync_runs has no rows");
}

console.log(`Render cron: ${service.suspended} ${schedule} ${command}`);
console.log(`Latest run: ${latestRun ? `${latestRun.entity_name} ${latestRun.status} ${latestRun.started_at}` : "none"}`);
console.log(`Checked entities: ${REQUIRED_SUCCESS_ENTITIES.length}`);

if (failures.length > 0) {
  console.error("Acumatica sync health verifier: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Acumatica sync health verifier: PASS");
